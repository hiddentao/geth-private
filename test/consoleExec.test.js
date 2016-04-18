"use strict";


var Q = require('bluebird'),
  chai = require('chai'),
  tmp = require('tmp'),
  path = require('path'),
  shell = require('shelljs'),
  Web3 = require('web3');

var expect = chai.expect,
  should = chai.should();

chai.use(require("chai-as-promised"));


var testUtils = require('./utils');

var source = require('../');



module.exports = {
  before: function(done) {
    this.inst = source();
    
    this.inst.start()
      .asCallback(done);
  },
  after: function(done) {
    Q.resolve().then(() => {
      if (this.inst.isRunning) {
        return this.inst.stop();
      }
    })
    .asCallback(done);
  },
  'execute bad console command': function() {
    this.inst.consoleExec('mining.whatever()')
      .should.be.rejected;
  },
  'execute good console command': function() {
    let version = testUtils.gethExecJs(this.inst.dataDir, 'web3.version.api');

    this.inst.consoleExec('web3.version.api').should.eventually.eql(version);
  },
};


