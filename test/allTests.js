var test = module.exports = {};

[
  'basic',
  'logger',
  'cleanup',
  'gethOptions',
  'gethPath',
  'customDataDir',
  'consoleExec',
].forEach(function(name) {
  test[name] = require(`./${name}.test`);
});
