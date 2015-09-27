'use strict'

var project = require('../project.js')
  , pkgLib = require('../package.js')

function deleteDependency(name) {
  project.getConfig(function (err, pkgConfig) {
    if (err) return console.log(err)

    project.deleteDependency(pkgConfig, function(err) {
      if (err) return console.log(err)
      console.log('removed ' + name + ' from mlpm.json')
    })
  })
}

function uninstall(args) {
  if ( !args.package ) {
    console.log( 'missing required parameter: package name' )
    console.log( uninstall.usage )
    return
  }

  pkgLib.uninstall(args.package, function(err) {
    if (err) return console.log(err)

    if (args.save) deleteDependency(args.package)
  })
}

uninstall.usage = 'mlpm uninstall <package> [--save]'

module.exports = uninstall
