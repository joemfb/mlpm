'use strict'

var log = require('winston')
var _ = require('lodash')
var project = require('../project.js')

function ls() {
  project.getPackages(function(err, packages) {
    _.each(packages, function(pkg, idx) {
      var symbol = idx + 1 === packages.length ? project.symbols.last :  project.symbols.pkg

      log.info( symbol + pkg.name + '@' + pkg.version )
    })
  })
}

ls.usage = 'mlpm ls'

module.exports.command = ls
