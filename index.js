'use strict'

var argsLib = require('./lib/args.js')
var _ = require('lodash')

_.each(argsLib.cmds, function(synonyms) {
  var cmd = synonyms[0]
  module.exports[ cmd ] = require( './lib/commands/' + cmd )
})
