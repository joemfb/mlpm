#!/usr/bin/env node
'use strict'

var args = require('../lib/args.js').parse()
var cmd

if ( !args.command ) {
  if ( args.argv.version ) {
    return console.log( require('../package.json').version )
  }

  if ( args.unknown ) {
    console.log( 'unknown command: ' + args.unknown )
  }
  return console.log( args.usage() )
}

cmd = require( '../lib/commands/' + args.command )

if ( args.help ) return console.log( cmd.usage )

cmd( args )
