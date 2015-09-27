'use strict'

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
      , updateGitRepo = true

    project.getRepoStatus(function(err, changes) {
      if (err) updateGitRepo = false

      if ( changes.length ) return console.log( new Error('git repository not clean') )

      updateVersion(pkgConfig, args.version, function(err) {
        if (err) return console.log(err)

        project.saveConfig(pkgConfig, function(err) {
          if (err) return console.log(err)

          console.log( 'updated project version from ' + oldVersion + ' to ' + pkgConfig.version )

          if ( !updateGitRepo ) return

          project.commitConfig( args.message || pkgConfig.version, function(err) {
            if (err) return console.log(err)

            project.tagRepo(pkgConfig.version, function(err) {
              if (err) return console.log(err)
            })
          })
        })
      })
    })
  })
}

version.usage = 'mlpm version [<newversion> | major | minor | patch | prerelease | preminor | premajor ]'

module.exports = version
