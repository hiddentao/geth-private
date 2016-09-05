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
  'bad path': function(done) {
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
      })
      .asCallback(done);    
  },
};

