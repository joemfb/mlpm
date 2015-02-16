'use strict';

var lib = require('./mlpm-lib.js')

function whoami(args) {
  lib.getConfig(function (err, data) {
    if (err) return console.log(err)
    console.log( data.username )
  })
}

whoami.usage = 'mlpm whoami'

module.exports = whoami
