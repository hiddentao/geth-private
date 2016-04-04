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
  beforeEach: function() {
    this.datadir = tmp.dirSync().name;
    // delete it straight away as we will get geth-private to create it for us
    shell.rm('-rf', this.datadir);

    this.inst = source({
      gethOptions:{
        datadir: this.datadir,
      }
    });
  },
  afterEach: function(done) {
    Q.resolve()
      .then(() => {
        if (this.inst && this.inst.isRunning) {
          return this.inst.stop({ kill: true });
        }
      })
      .then(() => {
        shell.rm('-rf', this.datadir);
      })
      .asCallback(done);
  },
  'will create it if it doesn\'t exist': function(done) {
    this.inst.start()
      .then(() => {
        shell.test('-e', this.datadir).should.be.true;
      })
      .asCallback(done);
  },
  'can re-use it': function(done) {
    let account = null;

    this.inst.start()
      .then(() => {
        account = this.inst.account;

        return this.inst.stop();
      })
      .then(() => {
        shell.test('-e', this.datadir).should.be.true;

        return this.inst.start();
      })
      .then(() => {
        this.inst.account.should.eql(account);

        let out = testUtils.gethExecJs(this.inst.dataDir, `web3.fromWei(eth.getBalance(eth.coinbase),"ether")`);

        out.trim().should.eql('5000000');  // 5million, awwww yeah ;)        
      })
      .asCallback(done);
  },
};


