"use strict";

var shell = require('shelljs');


const GETH = require('which').sync('geth');


var port = 60303,
  rpcport = 8545;

exports.gethOptions = function(opts) {
  // for Travis CI we need to increment the ports since sometimes the previous geth process can't be killed
  if (process.env.TRAVIS_CI) {
    port++;
    rpcport++;
  }
  
  return Object.assign({
    port: port,
    rpcport: rpcport,
  }, opts);
};


exports.stopOptions = function() {
  // for Travis CI we need to kill=true
  if (process.env.TRAVIS_CI) {
    return {
      kill: true
    };
  } else {
    return null;
  }
};


exports.canAttach = function(dataDir) {
  let ret = shell.exec(`${GETH} --exec 'eth.coinbase' attach ipc://${dataDir}/geth.ipc`, {
    silent: true,
    async: false,
  });

  return ret.code === 0;
};


exports.gethExecJs = function(dataDir, jsToExecute) {
  let ret = shell.exec(`${GETH} --exec '${jsToExecute}' attach ipc://${dataDir}/geth.ipc`, {
    silent: true,
    async: false,
  });

  if (ret.code !== 0) {
    throw new Error('Exec error: ' + ret.stderr);
  }

  return ret.stdout;
};










