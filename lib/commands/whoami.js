'use strict';

var util = require('../util.js')

function whoami(args) {
  util.getConfig(function (err, data) {
    if (err) return console.log(err)
    console.log( data.username )
  })
}

whoami.usage = 'mlpm whoami'

module.exports = whoami
