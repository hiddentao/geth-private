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
      rpc: true,
      rpcapi: "admin,db,eth,debug,miner,net,shh,txpool,personal,web3",
      maxpeers: 0,
      nodiscover: true,
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
    if (this.isRunning) {
      throw new Error('Already running');
    }

    this._log(`Starting...`);

    return Q.try(() => {
      this._createDataDir();
      this._createGenesisFile();
      this._startGeth();
    });
  }


  get isRunning () {
    return !!this._proc;
  }

  get pid () {
    return this._proc.pid;
  }


  stop(options) {
    return Q.try(() => {
      if (!this._proc) {
        throw new Error("Not started");
      }

      options = Object.assign({
        kill: false
      }, options);

      return new Q((resolve, reject) => {
        this._proc.on('close', (code, signal) => {
          this._log(`Stopped.`);

          this._proc = null;

          if (this._tmpDataDir) {
            this._log(`Destroying data...`);

            shell.rm('-rf', this._gethOptions.datadir);
          }

          resolve({
            code: code,
            signal: signal,
          });
        });

        this._log(`Stopping...`);

        this._proc.kill(options.kill ? 'SIGKILL' : 'SIGTERM');
      });
    });
  }

  /**
   * Execute a command in the JS console of the running geth instance.
   * @param  {String} jsCommand
   * @return {Promise}
   */
  consoleExec (jsCommand) {
    return Q.try(() => {
      if (!this._proc) {
        throw new Error("Not started");
      }

      return this._exec(
        this._buildGethCommandLine(
          ['--exec', `"${jsCommand}"`, 'attach', `ipc://${this.dataDir}/geth.ipc`]
        )
      ).stdout;
    });
  }


  get account () {
    return this._account;
  }

  get dataDir () {
    return this._gethOptions.datadir;
  }

  _createDataDir () {
    let options = this._gethOptions;

    // need to create temporary data dir?
    if (!options.datadir) {
      options.datadir = this._tmpDataDir = tmp.dirSync().name;

      this._log(`Created temporary data dir: ${options.datadir}`);
    }
    // else let's check the given one
    else {
      // if not found then try to create it
      if (!shell.test('-e', options.datadir)) {
        this._log(`Creating data dir: ${options.datadir}`);

        shell.mkdir('-p', options.datadir);
      }        
    }        
  }


  _createGenesisFile () {
    this._genesisFilePath = path.join(this._gethOptions.datadir, 'genesis.json');

    this._log(`Genesis file: ${this._genesisFilePath}`);

    if (!shell.test('-e', this._genesisFilePath)) {
      this._log(`Creating genesis file...`);

      // create genesis file
      let genesisStr = this._buildGenesisString();
      fs.writeFileSync(this._genesisFilePath, genesisStr);
      
      // start geth and create an account
      this._log(`Creating account...`);
      this._exec(
        this._buildGethCommandLine(
          ['js', path.join(__dirname, 'data', 'setup.js')]
        )
      );

      // load account info
      this._loadAccountInfo();

      // overwrite new genesis file with account and preset balance
      this._log(`Re-writing genesis file with presets...`);
      let alloc = {};
      alloc[this._account] = {
        "balance": "5000000000000000000000000"
      };
      let newGenesisStr = this._buildGenesisString({ alloc: alloc });
      fs.writeFileSync(this._genesisFilePath, newGenesisStr);
    } else {
      this._loadAccountInfo();
    }
  }


  _loadAccountInfo () {
    this._log(`Loading account info...`);

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

    this._account = accountMatch[1];

    this._log(`Account: ${this._account}`);
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
    this._log(`Starting geth long-running process...`);

    let gethcli = this._buildGethCommandLine();

    this._proc = this._exec(gethcli, {
      async: true,
    });

    this._proc.on('error', (err) => {
      this._logError('Child unexpectedly errored', err.toString());
    });
  }


  _buildGethCommandLine(command) {
    let gethOptions = this._gethOptions;

    let str = [];
    for (let key in gethOptions) {
      let val = gethOptions[key];

      if (null !== val && false !== val) {
        str.push(`--${key}`);

        if (typeof val === "string") {
          str.push(`"${val}"`);
        } else if (typeof val !== "boolean") {
          str.push(`${val}`);
        }        
      }
    }

    // genesis file
    str.push('--genesis', this._genesisFilePath);

    return `${this._geth} ${str.join(' ')} ${command ? command.join(' ') : ''}`;
  }


  _exec (cli, options) {
    this._log(`Executing command: ${cli}`);

    options = Object.assign({
      silent: !this._verbose,
      async: false,
    }, options);

    let ret = shell.exec(cli, options);

    // if async not true then check return code
    if (!options.async) {
      if (0 !== ret.code) {
        throw new Error('Execution failed: ' + ret.stderr);
      }
    }

    return ret;
  }


  _log () {
    if (this._verbose) {
      console.log.apply(console, arguments);
    }
  }


  _logError () {
    if (this._verbose) {
      console.error.apply(console, arguments);
    }
  }
}


module.exports = function(options) {
  return new Geth(options);
};
