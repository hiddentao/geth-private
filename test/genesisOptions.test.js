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
    this.inst = source({});

    this.inst.start()
      .then(() => {
        // check genesis file contents
        let genesisFile = JSON.parse(
          fs.readFileSync(this.inst._genesisFilePath, 'utf-8').toString()
        );

        _.pick(genesisFile,
          'config', 'gasLimit', 'difficulty', 'alloc'
        ).should.eql({
          "config": {
            "chainId": 1337,
            "homesteadBlock": 0,
            "eip150Block": 0,
            "eip155Block": 0,
            "eip158Block": 0,
          },
          "difficulty": "0xf0000",
          "gasLimit": "0x8000000",
          "alloc": {}
        });
      })
      .asCallback(done);
  },
  'override settings': function(done) {
    this.inst = source({
      genesisBlock: {
        difficulty: '0x400',
      }
    });

    this.inst.start()
      .then(() => {
        // check genesis file contents
        let genesisFile = JSON.parse(
          fs.readFileSync(this.inst._genesisFilePath, 'utf-8').toString()
        );

        _.pick(genesisFile,
          'difficulty'
        ).should.eql({
          difficulty: '0x400',
        });
      })
      .asCallback(done);
  }
};
