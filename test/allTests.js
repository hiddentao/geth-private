var test = module.exports = {};

[
  // 'basic', 
  // 'cleanup', 
  // 'gethOptions', 
  // 'gethPath', 
  'customDataDir',
].forEach(function(name) {
  test[name] = require(`./${name}.test`);
});



