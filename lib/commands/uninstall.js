'use strict';

var rimraf = require('rimraf')
  , lib = require('../mlpm-lib.js')

function deleteDependency(name) {
  lib.getMlpm(function (err, mlpm) {
    if (err) return console.log(err)

    delete mlpm.dependencies[name]
    lib.saveMlpm(mlpm, function(err) {
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

  rimraf('./mlpm_modules/' + args.package, function(err) {
    if (err) return console.log(err)

    if (args.save) deleteDependency(args.package)
  })
}

uninstall.usage = 'mlpm uninstall <package> [--save]'

module.exports = uninstall
