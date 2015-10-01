'use strict'

var log = require('winston')
var util = require('../util.js')

function whoami(args) {
  util.getConfig(function (err, data) {
    if (err) return log.error(err)
    log.info( data.username )
  })
}

whoami.usage = 'mlpm whoami'

module.exports.command = whoami
