'use strict';

var fs = require('fs')

function getAuth(cb) {
  //TODO: read ~/.mlpmrc, or prompt
  process.nextTick(function() {
    cb(null, {
      'user': 'admin',
      'pass': 'admin',
      'sendImmediately': false
    })
  })
}

function getMlpm(cb) {
  fs.readFile('mlpm.json', 'utf8', function (err, data) {
    if (err) return cb(err)
    cb(null, JSON.parse(data))
  })
}

function saveMlpm(data, cb) {
  var output = JSON.stringify(data, null, 2)
  fs.writeFile('mlpm.json', output, cb)
}

module.exports = {
  getAuth:  getAuth,
  getMlpm:  getMlpm,
  saveMlpm: saveMlpm
}
