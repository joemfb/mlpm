/* eslint-env mocha */
'use strict'

var expect = require('chai').expect

describe('require("mlpm")', function() {
  it('should expose commands as methods', function() {
    var mlpm = require('../')

    expect(mlpm).to.not.be.undefined
    expect(mlpm.deploy).to.not.be.undefined
    expect(mlpm.info).to.not.be.undefined
    expect(mlpm.init).to.not.be.undefined
    expect(mlpm.install).to.not.be.undefined
    expect(mlpm.login).to.not.be.undefined
    expect(mlpm.ls).to.not.be.undefined
    expect(mlpm.publish).to.not.be.undefined
    expect(mlpm.search).to.not.be.undefined
    expect(mlpm.uninstall).to.not.be.undefined
    expect(mlpm.unpublish).to.not.be.undefined
    expect(mlpm.version).to.not.be.undefined
    expect(mlpm.whoami).to.not.be.undefined
  })
})
