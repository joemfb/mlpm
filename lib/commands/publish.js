'use strict'

var log = require('winston')
var fs = require('fs')
var _ = require('lodash')
var hash = require('hash.js')
var util = require('../util.js')
var api = require('../api.js')
var project = require('../project.js')

function publishPackage(mlpm, auth, localExport) {
  project.createZip(mlpm, function(err, zip) {
    if (err) return log.error(err)

    var buffer = zip.generate({type: 'nodebuffer'})

    // TODO: process.nextTick()?
    mlpm.sha2sum = hash.sha256().update( buffer ).digest('hex')

    if ( localExport ) {
      return fs.writeFile( mlpm.name + '-' + mlpm.version + '.zip', buffer, function(err) {
        if (err) return log.error(err)
      })
    }

    api.publish(mlpm, buffer, auth, function(err, body) {
      if (err) return log.error(err)

      log.info( 'published ' + mlpm.name + '@' + mlpm.version )
    })
  })
}

function dryRun() {
  project.getConfig(function (err, pkgConfig) {
    if (err) return log.error(err)

    log.info( pkgConfig.name + '@' + pkgConfig.version )

    project.getFiles(pkgConfig, false, function(err, files) {
      if (err) return log.error(err)

      var cwd = process.cwd()

      _.each(files, function(file) {
        log.info( file.path.replace(cwd, '') )
      })
    })
  })
}

function publish(args) {
  if ( args.dryrun ) return dryRun()

  util.getAuth(args.admin, function(err, auth) {
    if (err) return log.error(err)

    project.getConfig(function(err, mlpm) {
      if (err) return log.error(err)

      if ( mlpm.private && !args.export ) return log.info('private; can\'t publish')

      publishPackage( mlpm, auth, args.export )
    })
  })
}

publish.usage = 'mlpm publish [--dry-run]'

module.exports.command = publish
