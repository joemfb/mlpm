'use strict'

var log = require('winston')
var pj  = require('prettyjson')
  , api = require('../api.js')
  , project = require('../project.js')

function showInfo(err, data) {
  if (err) return log.error(err)
  log.info( pj.render(data) )
}

function info(args) {
  if (args.package) {
    api.info(args.package, args.version, showInfo)
  } else {
    project.getConfig(showInfo)
  }
}

info.usage = 'mlpm info <package>'

module.exports.command = info
