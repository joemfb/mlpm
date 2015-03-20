#!/usr/bin/env node

;(function() {
  'use strict';

  var args = require('./lib/args.js')
    , cmd

  if ( !args.command ) {
    if ( args.unknown ) {
      console.log( 'unknown command: ' + args.unknown )
    }
    return console.log( args.usage() )
  }

  cmd = require( './lib/' + args.command )

  if ( args.help ) {
    console.log( cmd.usage )
  } else {
    cmd( args )
  }

})()
