'use strict';

var api = require('../api.js')
  , lib = require('../mlpm-lib.js')

function unpublish(args) {
  var forceDeleteAll = false

  if ( !args.package ) {
    console.log( 'missing required parameter: package name' )
    console.log( unpublish.usage )
    return
  }

  api.info(args.package, null, function(err, mlpm) {
    if (err) return console.log(err)

    if  ( !args.version || mlpm.versions.length === 1 ) {
      if ( args.force ) {
        forceDeleteAll = true
        console.log('Warning, unpublishing entire project using --force ...')
      } else {
        console.log( 'refusing to unpublish all versions of ' + args.package + '\n' +
                     'run with --force to do this.\n' )
        console.log( unpublish.usage )
        return
      }
    }

    lib.getAuth(args.admin, function(err, auth) {
      if (err) return console.log(err)

      api.unpublish(args.package, args.version, forceDeleteAll, auth, function(err) {
        if (err) return console.log(err)

        console.log( 'unpublished ' + args.package + (forceDeleteAll ? '' : '@' + args.version) )
      })
    })
  })
}

unpublish.usage = 'mlpm unpublish <package> [-f/--force]\n' +
                  'mlpm unpublish <package>@<version>'

module.exports = unpublish
