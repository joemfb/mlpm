#!/usr/bin/env node

;(function() {
  'use strict';

  var args = require('./lib/args.js')
    , cmds = {
        info:    require('./lib/info.js'),
        init:    require('./lib/init.js'),
        install: require('./lib/install.js'),
        publish: require('./lib/publish.js'),
        search:  require('./lib/search.js')
      }
    , cmd

  if ( args.command ) {
    cmd = cmds[ args.command ]

    if ( cmd ) {
      if ( args.help ) {
        console.log( cmd.usage )
      } else {
        cmd( args )
      }
    } else {
      console.log( 'unknown command: ' + args.command )
    }
  } else {
    console.log( args.usage() )
  }

})()
