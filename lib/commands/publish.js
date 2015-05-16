'use strict';

var fs = require('fs')
  , _ = require('lodash')
  , hash = require('hash.js')
  , util = require('../util.js')
  , api = require('../api.js')
  , project = require('../project.js')

function publishPackage(mlpm, auth, localExport) {
  project.createZip(mlpm, function(err, zip) {
    if (err) return console.log(err)

    var buffer = zip.generate({type: 'nodebuffer'})

    // TODO: process.nextTick()?
    mlpm.sha2sum = hash.sha256().update( buffer ).digest('hex')

    if ( localExport ) {
      return fs.writeFile( mlpm.name + '-' + mlpm.version + '.zip', buffer, function(err) {
        if (err) return console.log(err)
      })
    }

    api.publish(mlpm, buffer, auth, function(err, body) {
      if (err) return console.log(err)

      console.log( 'published ' + mlpm.name + '@' + mlpm.version )
    })
  })
}

function dryRun() {
  project.getConfig(function (err, pkgConfig) {
    if (err) return console.log(err)

    console.log( pkgConfig.name + '@' + pkgConfig.version )

    project.getFiles(pkgConfig, false, function(err, files) {
      if (err) return console.log(err)

      var cwd = process.cwd()

      _.each(files, function(file) {
        console.log( file.path.replace(cwd, '') )
      })
    })
  })
}

function publish(args) {
  if ( args.dryrun ) return dryRun()

  util.getAuth(args.admin, function(err, auth) {
    if (err) return console.log(err)

    project.getConfig(function(err, mlpm) {
      if (err) return console.log(err)

      if ( mlpm.private && !args.export ) return console.log('private; can\'t publish')

      publishPackage( mlpm, auth, args.export )
    })
  })
}

publish.usage = 'mlpm publish [--dry-run]'

module.exports = publish
