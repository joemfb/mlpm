'use strict';

var semver = require('semver')
  , project = require('../project.js')

// heavily inspired by https://github.com/npm/npm/blob/master/lib/version.js
function updateVersion(pkgConfig, version, cb) {
  var newVersion = semver.valid( version )

  if (!newVersion) newVersion = semver.inc( pkgConfig.version, version )

  // TODO: process.nextTick() ?

  if (!newVersion) return cb(new Error('invalid input: ' + version))
  if ( pkgConfig.version === newVersion ) return cb(new Error('Version not changed'))

  pkgConfig.version = newVersion

  cb(null)
}

function version(args) {
  project.getConfig(function(err, pkgConfig) {
    if (err) return console.log(err)

    var oldVersion = pkgConfig.version

    updateVersion(pkgConfig, args.version, function(err) {
      if (err) return console.log(err)

      project.saveConfig(pkgConfig, function(err) {
        if (err) return console.log(err)

        console.log( 'updated project version from ' + oldVersion + ' to ' + pkgConfig.version )
        console.log( '(you\'ll need to commit and tag on your own ;))' )
        // TODO: git add; git commit; git tag
      })
    })
  })
}

version.usage = 'mlpm version [<newversion> | major | minor | patch | prerelease | preminor | premajor ]'

module.exports = version
