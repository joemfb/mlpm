'use strict'

var log = require('winston')
var project = require('../project.js')
var pkgLib = require('../package.js')

function deleteDependency(name) {
  project.getConfig(function (err, pkgConfig) {
    if (err) return log.error(err)

    project.deleteDependency(pkgConfig, function(err) {
      if (err) return log.error(err)
      log.info('removed ' + name + ' from mlpm.json')
    })
  })
}

function uninstall(args) {
  if ( !args.package ) {
    log.error( 'missing required parameter: package name' )
    log.info( uninstall.usage )
    return
  }

  pkgLib.uninstall(args.package, function(err) {
    if (err) return log.error(err)

    log.info('uninstalled ' + args.package)

    if (args.save) deleteDependency(args.package)
  })
}

uninstall.usage = 'mlpm uninstall <package> [--save]'

module.exports.command = uninstall
