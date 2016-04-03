"use strict";

var path = require('path'),
  Q = require('bluebird'),
  tmp = require('tmp'),
  fs = require('fs'),
  shell = require('shelljs'),
  which = require('which');


class Geth {
  constructor(options) {
    options = options || {};

    // options for geth
    this._gethOptions = Object.assign({
      networkid: "33333",
      rpccorsdomain: "*",
      rpc: null,
      rpcapi: "admin,db,eth,debug,miner,net,shh,txpool,personal,web3",
      maxpeers: 0,
      nodiscover: null,
    }, options.gethOptions);

    // path to geth
    this._geth = options.gethPath;

    if (!this._geth) {
      try {
        this._geth = which.sync('geth');
      } catch (err) {
        throw new Error('Unable to find "geth" executable in PATH');
      }
    }

    // verbose logging
    this._verbose = !!options.verbose;
  }

  start() {
    return Q.try(() => {
      this._createDataDir();
      this._createGenesisFile();
      this._loadAccountInfo();
      this._startGeth();
    });
  }


  stop() {
    return Q.try(() => {
      if (!this._proc) {
        throw new Error("Not started");
      }

      return new Q((resolve, reject) => {
        this._proc.on('exit', function() {
          resolve();
        });

        this._proc.kill();  // kill the child
      });
    });
  }


  destroy () {
    shell.rm('-rf', this._gethOptions.datadir);
  }


  account () {
    return this._account;
  }


  _createDataDir () {
    let options = this._gethOptions;

    // need to create temporary data dir?
    if (!options.datadir) {
      options.datadir = this._tmpDataDir = tmp.dirSync().name;
    }
    // else let's check the given one
    else {
      // if not found then try to create it
      if (!shell.test('-e', options.datadir)) {
        shell.mkdir('-p', options.datadir);
      }        
    }        
  }


  _createGenesisFile () {
    this._genesisFilePath = path.join(this._gethOptions.datadir, 'genesis.json');

    if (!shell.test('-e', this._genesisFilePath)) {
      // create genesis file
      let genesisStr = this._buildGenesisString();
      fs.writeFileSync(this._genesisFilePath, genesisStr);
      
      // start geth and create an account
      this._exec(
        this._buildGethCommandLine(
          ['js', path.join(__dirname, 'data', 'setup.js')]
        )
      );

      // load account info
      this._loadAccountInfo();

      // overwrite new genesis file with account and preset balance
      let alloc = {};
      alloc[this._account] = {
        "balance": "5000000000000000000000000"
      };
      let newGenesisStr = this._buildGenesisString({ alloc: alloc });
      fs.writeFileSync(this._genesisFilePath, genesisStr);
    }
  }


  _loadAccountInfo () {
    // fetch account info from geth
    let str = this._exec(
      this._buildGethCommandLine(
        ['account', 'list']
      )
    ).stdout;

    // parse and get account id
    let accountMatch = /\{(.+)\}/.exec(str);
    if (!accountMatch) {
      throw new Error('Unable to fetch account info');
    }

    this._account = accountMatch[0];
  }


  _buildGenesisString (attrs) {
    return JSON.stringify(Object.assign({
      "nonce": "0xdeadbeefdeadbeef",
      "timestamp": "0x0",
      "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "extraData": "0x0",
      "gasLimit": "0x8000000",
      "difficulty": "0x400",
      "mixhash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "coinbase": "0x3333333333333333333333333333333333333333",
      "alloc": {}
    }, attrs), null, 2);
  }


  _startGeth() {
    let gethcli = this._buildGethCommandLine();

    this._proc = this._exec(getcli, {
      async: true,
    });

    this._proc.on('error', (err) => {
      console.error('Child unexpectedly errored', err.toString());
    });
  }


  _buildGethCommandLine(command) {
    let gethOptions = this._gethOptions;

    let str = [];
    for (let key in gethOptions) {
      str.push(`--${key}`);

      let val = gethOptions[key];

      if (null !== val) {

      }
      if (typeof val === "string") {
        str.push(`"${val}"`);
      } else {
        str.push(val);
      }
    }

    // genesis file
    str.push('--genesis', this._genesisFilePath);

    return `${this._geth} ${str.join(' ')} ${command ? command.join(' ') : ''}`;
  }


  _exec (cli, options) {
    options = Object.assign({
      silent: !this._verbose,
      async: false,
    }, options);

    return shell.exec(cli, options);
  }
}


module.exports = function(options) {
  return new Geth(options);
};
