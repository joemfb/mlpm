'use strict';

var vfs = require('vinyl-fs')
  , concat = require('concat-stream')
  , toposort = require('toposort')
  , async  = require('async')
  , _ = require('lodash')
  , pkgLib = require('./package.js')

/* inverse topological sort */
function sortPackages(packages) {
  var sortedNames = _.chain(packages)
    .filter(function(pkg) { return pkg.dependencies })
    .map(function(pkg) {
      return _.map(pkg.dependencies, function(_, dep) { return [dep, pkg.name] })
    })
    .flatten(false)
    .thru(toposort)
    .value()

  return _.sortBy(packages, function(pkg) {
    return sortedNames.indexOf(pkg.name)
  })
}

function getPackages(cb) {
  var src = vfs.src('./mlpm_modules/*/mlpm.json')

  src.on('error', cb)

  src.pipe(concat(function(files) {
    cb(null,
      sortPackages(
        _.map(files, function(file) {
          // TODO try/catch?
          return JSON.parse(file.contents)
        })
      )
    )
  }))
}

function preparePackages(packages, cb) {
  async.map(packages, pkgLib.preparePackage, cb)
}

module.exports = {
  getPackages: getPackages,
  preparePackages: preparePackages
}
