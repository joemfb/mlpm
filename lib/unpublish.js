'use strict';

var api = require('./api.js')
  , lib = require('./mlpm-lib.js')

function unpublish(args) {
  if ( !args.package ) {
    console.log( 'missing required parameter: package name' )
    console.log( unpublish.usage )
    return
  }

  if ( !args.version && !args.force ) {
    console.log( 'refusing to delete all versions of ' + args.package + '\n' +
                 'run with --force to do this.\n' )
    console.log( unpublish.usage )
    return
  }

  lib.getAuth(function(err, auth) {
    if (err) return console.log(err)

    api.unpublish(args.package, args.version, auth, function(err, data) {
      if (err) return console.log(err)

      console.log( 'unpublished ' + args.package + '@' + (args.version || 'latest') )
    })
  })
}

unpublish.usage = 'mlpm unpublish <package> [-f/--force]\n' +
                  'mlpm unpublish <package>@<version>'

module.exports = unpublish
