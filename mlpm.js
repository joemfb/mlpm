#!/usr/bin/env node
'use strict';

var argsLib = require('./lib/args.js')
  , _ = require('lodash')

function run() {
  var args = argsLib.parse()
    , cmd

  if ( !args.command ) {
    if ( args.unknown ) {
      console.log( 'unknown command: ' + args.unknown )
    }
    return console.log( args.usage() )
  }

  cmd = require( './lib/commands/' + args.command )

  if ( args.help ) {
    console.log( cmd.usage )
  } else {
    cmd( args )
  }
}

function exports() {
  _.each(argsLib.cmds, function(synonyms) {
    var cmd = synonyms[0]
    module.exports[ cmd ] = require( './lib/commands/' + cmd )
  })
}

if ( !module.parent ) {
  run()
} else {
  exports()
}
