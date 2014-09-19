#!/usr/bin/env node
'use strict';

var pj   = require('prettyjson')
  , args = require('./lib/args.js')
  , _api = require('./lib/api.js')
  , lib  = require('./lib/mlpm-lib.js')
  , opt  = { registry: 'http://localhost:8010' }
  , api

function info() {
  if (args.package) {
    api.info(args.package, args.version, function (err, data) {
      if (err) return console.log(err)
      console.log( pj.render(data) )
    })
  } else {
    lib.getMlpm(function (err, data) {
      if (err) return console.log(err)
      console.log( pj.render(data) )
    })
  }
}

function init() {
  console.log('initing, yo')
}

function install() {
  console.log('installing, yo')

  lib.getMlpm(function (err, data) {
    if (err) {
      if (!args.package) return console.log(err)
    }

    if (args.package) {
      if ( data && args.package === data.name ) {
        return console.log('can\'t depend on yourself ;)')
      } else {
        api.installNewDependency(args.package, args.version, args.save)
      }
    } else {
      api.installDependencies(data.dependencies)
    }
  })
}

function publish() {
  console.log('publishing, yo')
  lib.getMlpm(function (err, data) {
    if (err) return console.log(err)
    lib.createZip(function(err, buffer) {
      if (err) return console.log(err)
      api.publishZip(data, buffer)
    })
  })
}

function run() {
  switch(args.command) {
    case 'info':
      info()
      break
    case 'install':
      install()
      break
    case 'publish':
      publish()
      break
    case 'init':
      init()
      break
    default:
      console.log(args.usage())
  }
}

(function() {
  lib.getAuth(function(err, auth) {
    if (err) return console.log(err)

    opt.auth = auth
    api = _api(opt)
    run()
  })
})()
