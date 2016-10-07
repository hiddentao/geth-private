"use strict";


var Q = require('bluebird'),
  chai = require('chai'),
  tmp = require('tmp'),
  path = require('path'),
  shell = require('shelljs'),
  Web3 = require('web3');

var expect = chai.expect,
  should = chai.should();


var testUtils = require('./utils');

var source = require('../');




module.exports = {
  afterEach: function(done) {
    Q.resolve()
      .then(() => {
        if (this.inst && this.inst.isRunning) {
          return this.inst.stop();
        }
      })
      .asCallback(done);
  },
  'override': function(done) {
    this.inst = source({
      gethOptions: {
        rpc: false,
        identity: 'testnode123',
        port: 44323,        
        rpcport: 8545,
      },
    });

    this.inst.start()
      .then(() => {
        let out = testUtils.gethExecJs(this.inst.dataDir, `admin.nodeInfo`);
        out.should.contain('testnode123');
        out.should.contain('listener: 44323');
      })
      .then(() => {
        var web3 = new Web3();
        web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

        web3.eth.coinbase.should.eql(this.inst.account);
      })
      .asCallback(done);
  }
};

