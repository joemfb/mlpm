'use strict'

var log = require('winston')
var argsLib = require('./lib/args.js')
var _ = require('lodash')

log.remove(log.transports.Console)
log.add(log.transports.File, { filename: 'mlpm.log' })
log.level = 'error'

_.each(argsLib.cmds, function(synonyms) {
  var cmd = synonyms[0]
  module.exports[ cmd ] = require( './lib/commands/' + cmd ).command
})
