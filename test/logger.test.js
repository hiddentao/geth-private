"use strict";


var Q = require('bluebird'),
  chai = require('chai'),
  sinon = require('sinon'),
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
    this.mocker = sinon.sandbox.create();
  },
  afterEach: function(done) {
    this.mocker.restore();
    if (this.inst && this.inst.isRunning) {
      this.inst.stop().asCallback(done);
    } else {
      done();
    }
  },
  default: function(done) {
    const infoSpy = this.mocker.stub(console, 'info');
      
    this.inst = source({
      verbose: true,
    });

    this.inst.start()
      .then(() => {
        infoSpy.should.have.been.called;
      })
      .asCallback(done);
  },
  custom: function(done) {
    const logger = {
      debug: this.mocker.spy(),
      info: this.mocker.spy(),
      error: this.mocker.spy(),
    };
      
    this.inst = source({
      verbose: true,
      logger: logger,
    });

    this.inst.start()
      .then(() => {
        logger.debug.should.have.been.called;
        logger.info.should.have.been.called;
      })
      .asCallback(done);
  },
};


