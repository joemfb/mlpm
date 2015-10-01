'use strict'

var log = require('winston')
var api = require('../api.js')
var util = require('../util.js')

function unpublish(args) {
  var forceDeleteAll = false

  if ( !args.package ) {
    log.error( 'missing required parameter: package name' )
    log.info( unpublish.usage )
    return
  }

  api.info(args.package, null, function(err, mlpm) {
    if (err) return log.error(err)

    if  ( !args.version || mlpm.versions.length === 1 ) {
      if ( args.force ) {
        forceDeleteAll = true
        log.info('Warning, unpublishing entire project using --force ...')
      } else {
        log.error( 'refusing to unpublish all versions of ' + args.package + '\n' +
                     'run with --force to do this.\n' )
        log.info( unpublish.usage )
        return
      }
    }

    util.getAuth(args.admin, function(err, auth) {
      if (err) return log.error(err)

      api.unpublish(args.package, args.version, forceDeleteAll, auth, function(err) {
        if (err) return log.error(err)

        log.info( 'unpublished ' + args.package + (forceDeleteAll ? '' : '@' + args.version) )
      })
    })
  })
}

unpublish.usage = 'mlpm unpublish <package> [-f/--force]\n' +
                  'mlpm unpublish <package>@<version>'

module.exports.command = unpublish
