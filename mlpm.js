#!/usr/bin/env node

;(function() {
  'use strict';

  var args    = require('./lib/args.js')
    , info    = require('./lib/info.js')
    , init    = require('./lib/init.js')
    , install = require('./lib/install.js')
    , publish = require('./lib/publish.js')

  switch(args.command) {
    case 'info':
      info(args)
      break
    case 'install':
      install(args)
      break
    case 'init':
      init()
      break
    case 'publish':
      publish()
      break
    default:
      if (args.command) {
        console.log('unknown command: ' + args.command)
      }
      console.log(args.usage())
  }
})()
