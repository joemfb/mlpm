'use strict';

var nodetree = require('nodetree')

function ls() {
  nodetree('./mlpm_modules', {
    directories: true,
    level: 1,
    noreport: true
  })
}

ls.usage = 'mlpm ls'

module.exports = ls
