"use strict";

var path = require('path'),
  chalk = require('chalk'),
  Q = require('bluebird'),
  tmp = require('tmp'),
  fs = require('fs'),
  child_process = require('child_process'),
  bufferedSpawn = require('buffered-spawn'),
  shell = require('shelljs'),
  which = require('which');


class Geth {
  constructor(options) {
    options = options || {};

    // options for geth
    this._gethOptions = Object.assign({
      networkid: 33333,
      port: 60303,
      rpc: true,
      rpcport: 8545,
      rpccorsdomain: "*",
      rpcapi: "admin,db,eth,debug,miner,net,shh,txpool,personal,web3",
      maxpeers: 0,
      nodiscover: true,
      // reduce overhead
      minerthreads: 1,
      lightkdf: true,
      cache: 16,
      // logging
      // verbosity: 6,
    }, options.gethOptions, {
      rpc: true,
    });

    // path to geth
    this._geth = options.gethPath;
    
    // genesis options
    this._genesisOptions = options.genesisBlock || null;

    if (!this._geth) {
      try {
        this._geth = which.sync('geth');
      } catch (err) {
        throw new Error('Unable to find "geth" executable in PATH');
      }
    }

    // verbose logging
    this._verbose = !!options.verbose;

    // auto-mine until balance
    this._initialBalance = parseFloat(options.balance || 0);
    
    // auto-mine indefinitely
    this._autoMine = !!options.autoMine;
  }

  start() {
    if (this.isRunning) {
      throw new Error('Already running');
    }

    this._log(`Starting...`);

    return this._createDataDir()
      .then(() => this._setupAccountInfo())
      .then(() => this._startGeth())
    ;
  }



  stop(options) {
    return Q.try(() => {
      if (!this._proc) {
        throw new Error("Not started");
      }

      options = Object.assign({
        kill: false,
      }, options);

      return new Q((resolve) => {
        this._proc.on('exit', (code, signal) => {
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

      this._log(`Execute in console: ${jsCommand}`);

      return this._exec(
        this._buildGethCommandLine({
          command: ['--exec', `"${jsCommand}"`, 'attach', `ipc://${this.dataDir}/geth.ipc`]
        })
      ).then((ret) => ret.stdout);
    });
  }

  get httpRpcEndpoint () {
    return `http://localhost:${this._gethOptions.rpcport}`;
  }

  get account () {
    return this._account;
  }

  get dataDir () {
    return this._gethOptions.datadir;
  }

  get isRunning () {
    return !!this._proc;
  }

  get pid () {
    return this._proc.pid;
  }

  _createDataDir () {
    return Q.try(() => {
      let options = this._gethOptions;
      
      // need to create temporary data dir?
      if (!options.datadir) {
        options.datadir = this._tmpDataDir = tmp.dirSync().name;
        
        this._log(`Created temporary data dir: ${options.datadir}`);
      }
      // else let's check the given one
      else {
        // resolve path (against current app folder)
        options.datadir = path.resolve(process.cwd(), options.datadir);
        
        // if not found then try to create it
        if (!shell.test('-e', options.datadir)) {
          this._log(`Creating data dir: ${options.datadir}`);
          
          shell.mkdir('-p', options.datadir);
        }        
      }        
    });
  }


  _setupAccountInfo () {
    return Q.try(() => {
      this._genesisFilePath = path.join(this._gethOptions.datadir, 'genesis.json');
      
      this._log(`Genesis file: ${this._genesisFilePath}`);
      
      if (!shell.test('-e', this._genesisFilePath)) {
        this._log(`Creating genesis file...`);
        
        // create genesis file
        let genesisStr = this._buildGenesisString();
        fs.writeFileSync(this._genesisFilePath, genesisStr);
        
        // initialize the chain
        this._log(`Creating genesis chain data...`);
        
        return this._exec(
          this._buildGethCommandLine({
            command: ['init', this._formatPathForCli(this._genesisFilePath)]
          })
        )
          // start geth and create an account
          .then((ret) => {
            this._log(`Creating account...`);
            
            return this._exec(
              this._buildGethCommandLine({
                command: ['js', 
                  this._formatPathForCli(path.join(__dirname, 'data', 'setup.js'))
                ],
              })
            );
          })
          // load account info
          .then(() => this._loadAccountInfo());
      } else {
        return this._loadAccountInfo();
      }
    });
  }


  _loadAccountInfo () {
    return Q.try(() => {
      this._log(`Loading account info...`);
      
      // fetch account info from geth
      return this._exec(
        this._buildGethCommandLine({
          command: ['account', 'list']
        })
      ).then((ret) => {
        let str = ret.stdout;
        
        // parse and get account id
        let accountMatch = /\{(.+)\}/.exec(str);
        if (!accountMatch) {
          throw new Error('Unable to fetch account info');
        }
        
        this._account = accountMatch[1];
        
        this._log(`Account: ${this._account}`);
      });
    });
  }


  _buildGenesisString (attrs) {
    return JSON.stringify(Object.assign({
      "nonce": "0xdeadbeefdeadbeef",
      "timestamp": "0x0",
      "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "extraData": "0x0",
      "gasLimit": "0x8000000",
      "difficulty": "0xf0000",
      "mixhash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "coinbase": "0x3333333333333333333333333333333333333333",
      "alloc": {}
    }, this._genesisOptions, attrs), null, 2);
  }


  _startGeth() {
    return new Q((resolve, reject) => {
      this._log(`Starting geth long-running process...`);
      
      let gethcli = this._buildGethCommandLine({
        quoteStrings: false,
      });
      
      this._proc = child_process.spawn(gethcli[0], gethcli.slice(1),{
        detached: false,
        shell: false,
        stdio:['ignore', 'pipe', 'pipe'],
      });
      
      this._proc.on('error', (err) => {
        this._logError('Child unexpectedly errored', err.toString());
        
        reject(err);
      });
      
      const _handleOutput = (buf) => {
        const str = buf.toString();
        
        if (0 <= str.toLowerCase().indexOf('http endpoint opened')) {
          resolve();
        }
        
        if (this._verbose) {
          this._logNode(str);
        }
      };

      this._proc.stdout.on('data', _handleOutput);
      this._proc.stderr.on('data', _handleOutput);
    })
      .then(() => {
        if (this._initialBalance || this._autoMine) {
          this._log(`Auto-start mining...`);
          
          this._runMiningLoop();        
        }
      });
  }


  _runMiningLoop () {
    setTimeout(() => {
      if (!this._proc) {
        return;
      }

      Q.all([
        this.consoleExec(`web3.fromWei(eth.getBalance('0x${this._account}'), 'ether')`),
        this.consoleExec(`eth.mining`),
      ])
      .spread((balance, isMining) => {
        balance = parseFloat(balance.trim());
        isMining = ('true' === isMining.trim());
        
        let keepGoing = true;
        
        return Q.try(() => {
          if (this._autoMine) {
            return;
          } else if (this._initialBalance) {
            if (balance < this._initialBalance) {
              this._log(`Account balance (${balance}) is < limit (${this._initialBalance}).`);
            } else {
              this._log(`Account balance (${balance}) is >= limit (${this._initialBalance}).`);

              keepGoing = false;
            }
          }
        })
        .then(() => {
          if (keepGoing) {
            return Q.try(() => {
              if (!isMining) {
                this._log(`Start mining...`);              

                return this.consoleExec('miner.start()');
              }                                
            })
            .then(() => this._runMiningLoop());
          } else {
            if (isMining) {
              this._log(`Stop mining...`);

              return this.consoleExec('miner.stop()');              
            }
          }
        });
      })
      .catch((err) => {
        this._logError('Error fetching account balance', err);
      });      
    }, 500);
  }


  _buildGethCommandLine(opts) {
    opts = Object.assign({
      command: [],
      quoteStrings: true
    }, opts);
    
    let gethOptions = this._gethOptions;

    let str = [];
    for (let key in gethOptions) {
      let val = gethOptions[key];

      if (null !== val && false !== val) {
        str.push(`--${key}`);

        if (typeof val === "string") {
          if ('datadir' === key) {
            val = this._formatPathForCli(val);
          } else {
            val = opts.quoteStrings ? `"${val}"` : val;
          }
          str.push(val);
        } else if (typeof val !== "boolean") {
          str.push(`${val}`);
        }        
      }
    }
    
    // add etherbase param
    if (this.account) {
      str.push(`--etherbase`);
      str.push(this.account);
    }

    return [this._geth].concat(str, opts.command);
  }


  /**
   * @return {Promise}
   */
  _exec (cli, options) {
    this._log(`Executing command: ${cli.join(" ")}`);

    return bufferedSpawn(cli[0], cli.slice(1))
      .catch((err) => {
        this._logError(`Execution failed: ${err.status}: ${err.stdout} ${err.stderr}`);
        
        throw err;
      });    
  }


  _log () {
    if (this._verbose) {
      let args = Array.prototype.map.call(arguments, (a) => {
        return chalk.cyan(a);
      });

      console.log.apply(console, args);
    }
  }
  
  
  _logNode () {
    if (this._verbose) {
      console.info.apply(console, arguments);
    }
  }


  _logError () {
    if (this._verbose) {
      let args = Array.prototype.map(arguments, (a) => {
        return chalk.red(a);
      });

      console.error.apply(console, arguments);
    }
  }
  
  
  _formatPathForCli (pathStr) {
    return (0 <= pathStr.indexOf(' ')) ? `"${pathStr}"` : pathStr;
  }
}


module.exports = function(options) {
  return new Geth(options);
};
