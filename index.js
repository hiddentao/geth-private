"use strict";

var path = require('path'),
  chalk = require('chalk'),
  Q = require('bluebird'),
  tmp = require('tmp'),
  fs = require('fs'),
  child_process = require('child_process'),
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
      rpcport: 58545,
      rpccorsdomain: "*",
      rpcapi: "admin,db,eth,debug,miner,net,shh,txpool,personal,web3",
      maxpeers: 0,
      nodiscover: true,
      dev: true,
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

    // logging
    this._verbose = !!options.verbose;
    this._logger = options.logger || console;
  }

  start() {
    if (this.isRunning) {
      throw new Error('Already running');
    }

    this._log(`Starting...`);

    return this._createDataDir()
      .then(() => this._startGeth())
      .then((ret) => {
        this._proc = ret.proc;

        return this._loadAccountInfo();
      });
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
          command: ['--exec', `"${jsCommand}"`, 'attach',
            this._formatPathForCli(`ipc://${this.dataDir}/geth.ipc`)
          ]
        })
      ).then((ret) => {
        return ret.stdout;
      });
    });
  }

  get httpRpcEndpoint () {
    return `http://localhost:${this._gethOptions.rpcport}`;
  }

  get dataDir () {
    return this._gethOptions.datadir;
  }

  get isRunning () {
    return !!this._proc;
  }

  get account () {
    return this._account;
  }

  get pid () {
    return this._proc.pid;
  }

  _loadAccountInfo () {
    return this.consoleExec('eth.coinbase').then(account => {
      this._account = JSON.parse(account);
    });
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

    return [this._geth].concat(str, opts.command);
  }


  /**
   * @return {Promise}
   */
  _startGeth() {
    const gethcli = this._buildGethCommandLine({
      quoteStrings: false,
    });

    return this._exec(gethcli, {
      longRunning: true
    })
  }


  /**
   * @return {Promise}
   */
  _exec (cli, options) {
    options = Object.assign({
      longRunning: false,
    }, options);

    // execute a command
    if (!options.longRunning) {
      return new Q((resolve, reject) => {
        cli[0] = this._formatPathForCli(cli[0]);

        const cmdStr = cli.join(' ');

        this._log(`Executing geth command:  ${cmdStr}`);

        child_process.exec(cmdStr, (err, stdout, stderr) => {
          if (err) {
            err = new Error(`Execution failed: ${err}`);

            this._logError(err);

            reject(err);
          } else {
            resolve({
              stdout: stdout.trim(),
              stderr: stderr.trim(),
            });
          }
        });
      });
    }
    // start a node instance
    else {
      return new Q((resolve, reject) => {
        this._log(`Starting geth process: ${cli.join(' ')}`);

        let isRunning = false,
        successTimer = null;

        const proc = child_process.spawn(cli[0], cli.slice(1),{
          detached: false,
          shell: false,
          stdio:['ignore', 'pipe', 'pipe'],
        });

        const ret = {
          stdout: '',
          stderr: '',
        };

        const _handleError = (err) => {
          if (isRunning) {
            return;
          }

          clearTimeout(successTimer);

          err = new Error(`Startup error: ${err}`);

          this._logError(err);

          Object.assign(err, ret);

          return reject(err);
        };

        const _handleOutput = (stream) => (buf) => {
          const str = buf.toString();

          ret[stream] += str;

          this._logNode(str);

          if (str.match(/fatal/igm)) {
            _handleError(str);
          }
        };

        proc.on('error', _handleError);
        proc.stdout.on('data', _handleOutput('stdout'));
        proc.stderr.on('data', _handleOutput('stderr'));

        // after 3 seconds assume startup is successful
        successTimer = setTimeout(() => {
          this._log('Node successfully started');

          isRunning = true;

          ret.proc = proc;

          resolve(ret);
        }, 3000);
      });
    }
  }


  _log () {
    if (this._verbose) {
      let args = Array.prototype.map.call(arguments, (a) => {
        return chalk.cyan(a);
      });

      this._logger.info.apply(this._logger, args);
    }
  }


  _logNode (str) {
    if (this._verbose) {
      this._logger.info(str.trim());
    }
  }


  _logError () {
    if (this._verbose) {
      let args = Array.prototype.map.call(arguments, (a) => {
        return chalk.red(a + '');
      });

      this._logger.error.apply(this._logger, arguments);
    }
  }


  _formatPathForCli (pathStr) {
    return (0 <= pathStr.indexOf(' ')) ? `"${pathStr}"` : pathStr;
  }
}


module.exports = function(options) {
  return new Geth(options);
};
