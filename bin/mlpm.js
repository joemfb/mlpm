#!/usr/bin/env node
'use strict'

var log = require('winston')
var args = require('../lib/args.js').parse()
var cmd

log.remove(log.transports.Console)
log.add(log.transports.Console, { showLevel: false })

if ( !args.command ) {
  if ( args.argv.version ) {
    return log.info( require('../package.json').version )
  }

  if ( args.unknown ) {
    log.info( 'unknown command: ' + args.unknown )
  }
  return log.info( args.usage() )
}

cmd = require( '../lib/commands/' + args.command )

if ( args.help ) return log.info( cmd.usage )

// configure logs for commands
if ( args.q ) {
  log.level = 'error'
}

cmd( args )
