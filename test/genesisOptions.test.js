"use strict";


var _ = require('lodash'),
  Q = require('bluebird'),
  fs = require('fs'),
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
  afterEach: function(done) {
    Q.resolve().then(() => {
      if (this.inst && this.inst.isRunning) {
        return this.inst.stop();
      }
    })
    .asCallback(done);
  },
  'default': function(done) {
    this.inst = source({
      
    });

    this.inst.start()
      .then(() => {
        // check genesis file contents
        let genesisFile = JSON.parse(
          fs.readFileSync(this.inst._genesisFilePath, 'utf-8').toString()
        );

        _.pick(genesisFile, 
          'nonce', 'timestamp', 'parentHash', 'extraData', 'gasLimit', 
          'difficulty', 'mixhash', 'coinbase'
        ).should.eql({
          nonce: '0xdeadbeefdeadbeef',
          timestamp: '0x0',
          parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          extraData: '0x0',
          gasLimit: '0x8000000',
          difficulty: '0xf0000',
          mixhash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          coinbase: '0x3333333333333333333333333333333333333333'
        });
      })
      .asCallback(done);
  },
  'override settings': function(done) {
    this.inst = source({
      
      genesisBlock: {
        difficulty: '0x400',
        extraData: '0x1',
      }
    });

    this.inst.start()
      .then(() => {
        // check genesis file contents
        let genesisFile = JSON.parse(
          fs.readFileSync(this.inst._genesisFilePath, 'utf-8').toString()
        );

        _.pick(genesisFile, 
          'nonce', 'timestamp', 'parentHash', 'extraData', 'gasLimit', 
          'difficulty', 'mixhash', 'coinbase'
        ).should.eql({
          nonce: '0xdeadbeefdeadbeef',
          timestamp: '0x0',
          parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          extraData: '0x1',
          gasLimit: '0x8000000',
          difficulty: '0x400',
          mixhash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          coinbase: '0x3333333333333333333333333333333333333333'
        });
      })
      .asCallback(done);
  }
};


