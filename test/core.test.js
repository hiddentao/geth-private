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



var test = module.exports = {};




test['default'] = {
  before: function() {
    this.inst = source();
  },
  'not started': function() {
    this.inst.isRunning.should.be.false;
    expect(this.inst.account).to.be.undefined;
  },
  'not stoppable': function(done) {
    this.inst.stop()
      .catch((err) => {
        err.toString().should.contain('Not started');
      })
      .asCallback(done);
  },
  'once started': {
    before: function(done) {
      this.inst.start().asCallback(done);
    },
    after: function(done) {
      Q.resolve().then(() => {
        if (this.inst.isRunning) {
          return this.inst.stop();
        }
      })
      .asCallback(done);
    },
    'is running': function() {
      this.inst.isRunning.should.be.true;
    },
    'account': function() {
      (this.inst.account || '').length.should.eql(40);
    },
    'data dir': function() {
      expect((this.inst.dataDir || '').length > 0).to.be.true;
    },
    'attach console': {
      'check coinbase': function() {
        let out = testUtils.gethExecJs(this.inst.dataDir, `eth.coinbase`);

        out.trim().should.eql(`\"0x${this.inst.account}\"`);
      },    
      'check balance': function() {
        let out = testUtils.gethExecJs(this.inst.dataDir, `web3.fromWei(eth.getBalance(eth.coinbase),"ether")`);

        out.trim().should.eql('5000000');  // 5million, awwww yeah ;)
      },  
    },
    'rpc': {
      before: function() {
        this.web3 = new Web3();
        this.web3.setProvider(new this.web3.providers.HttpProvider('http://localhost:8545'));
      },
      'get coinbase': function() {
        this.web3.eth.coinbase.should.eql(`0x${this.inst.account}`);
      },
    }
  },
};



test['geth options'] = {
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
      }
    });

    this.inst.start()
      .then(() => {
        let out = testUtils.gethExecJs(this.inst.dataDir, `admin.nodeInfo`);
        out.should.contain('Geth/testnode123');
        out.should.contain('listener: 44323');
      })
      .then(() => {
        var web3 = new Web3();
        web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

        expect(() => {
          return web3.eth.coinbase;
        }).to.throw('Invalid JSON RPC response: undefined');
      })
      .asCallback(done);
  }
};




test['cleanup'] = {
  beforeEach: function(done) {
    this.inst = source();

    this.inst.start().asCallback(done);
  },
  afterEach: function(done) {
    Q.resolve()
      .then(() => {
        if (this.inst && this.inst.isRunning) {
          return this.inst.stop();
        }
      })
      .asCallback(done);
  },
  'can stop geth': function(done) {
    testUtils.canAttach(this.inst.dataDir).should.be.true;
    
    this.inst.stop()
      .then(() => {
        testUtils.canAttach(this.inst.dataDir).should.be.false;
      })
      .asCallback(done);
  },
  'leaves data folder intact': function(done) {
    this.inst.stop()
      .then(() => {
        shell.test('-e', path.join(this.inst.dataDir, 'genesis.json')).should.be.true;
      })
      .asCallback(done);
  },
  'can destroy data': {
    'without problem': function(done) {
      this.inst.stop()
        .then(() => {
          this.inst.destroyData();
          shell.test('-e', path.join(this.inst.dataDir)).should.be.false;
        })
        .asCallback(done);
    },
    'but not when running': function() {
      expect(() => {
        this.inst.destroyData();
      }).to.throw('Cannot destroy while still running');
    },
  },
},



test['bad geth path'] = function(done) {
  this.inst = source({
    gethPath: '/usr/bin/doesnotexist',
  });

  this.inst.start()
    .then(() => {
      throw new Error('Should not be here');
    })
    .catch((err) => {
      err += '';

      err.should.contain('Execution failed');
      err.should.contain('No such file or directory');
    })
    .asCallback(done);
};




test['custom data dir'] = {
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
          return this.inst.stop();
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


