var test = module.exports = {};

[
  // 'basic', 
  // 'cleanup', 
  // 'gethOptions', 
  // 'gethPath', 
  // 'customDataDir',
  // 'genesisOptions', 
  // 'consoleExec', 
  'balance', 
  // 'autoMine',
].forEach(function(name) {
  test[name] = require(`./${name}.test`);
});



