"use strict";

var shell = require('shelljs');


const GETH = require('which').sync('geth');



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










