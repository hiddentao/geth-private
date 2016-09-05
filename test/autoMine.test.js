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
      autoMine: true,
      genesisBlock: {
        difficulty: '0x1',
        extraData: '0x1',
      },
      
    });
    
    inst.start()
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
  'check that the balance is > 0': function(done) {
    Q.delay(20000)
      .then(() => {
        return this.inst.consoleExec('web3.fromWei(eth.getBalance(eth.coinbase), \'ether\')');
      })
      .then((balance) => {
        expect(parseInt(balance) > 0).to.be.true;
      })
      .asCallback(done);
  },
  'check that mining is auto-resumed even if stopped': function(done) {
    let initialBalance = 0;
    
    this.inst.consoleExec('miner.stop()')
      .then(() => this.inst.consoleExec('web3.fromWei(eth.getBalance(eth.coinbase), \'ether\')'))
      .then((balance) => {
        initialBalance = parseInt(balance);
      })
      .delay(20000)
      .then(() => this.inst.consoleExec('web3.fromWei(eth.getBalance(eth.coinbase), \'ether\')'))
      .then((balance) => {
        balance = parseInt(balance);
        
        expect(balance > initialBalance).to.be.true;
      })
      .asCallback(done);
  }  
};


