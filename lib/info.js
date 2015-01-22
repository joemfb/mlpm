'use strict';

var pj  = require('prettyjson')
  , api = require('./api.js')
  , lib = require('./mlpm-lib.js')

function showInfo(err, data) {
  if (err) return console.log(err)
  console.log( pj.render(data) )
}

function info(args) {
  if (args.package) {
    api.info(args.package, args.version, showInfo)
  } else {
    lib.getMlpm(showInfo)
  }
}

info.usage = 'mlpm info <package>'

module.exports = info
