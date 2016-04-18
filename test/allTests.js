var test = module.exports = {};

[
  'basic', 
  'cleanup', 
  'gethOptions', 
  'gethPath', 
  'customDataDir',
  'consoleExec', 
].forEach(function(name) {
  test[name] = require(`./${name}.test`);
});



