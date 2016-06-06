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
    let inst = this.inst = source({
      balance: 5,
      genesisBlock: {
        difficulty: '0x10',
        extraData: '0x1',
      },
    });
    
    Q.delay(5000)
      .then(function() {
        return inst.start()
      });
      .asCallback(done);
  },
  after: function(done) {
    Q.resolve().then(() => {
      if (this.inst.isRunning) {
        return this.inst.stop({ kill: true });
      }
    })
    .asCallback(done);
  },
  'check that the balance is eventually 5': function(done) {
    this.timeout(10000);

    Q.delay(8000)
      .then(() => {
        return this.inst.consoleExec('web3.fromWei(eth.getBalance(eth.coinbase), \'ether\')');
      })
      .then((balance) => {
        expect(parseInt(balance) >= 5).to.be.true;
      })
      .asCallback(done);
  }
};


