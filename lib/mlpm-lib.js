'use strict';

var fs     = require('fs')
  , path   = require('path')
  , mkdirp = require('mkdirp')
  , vfs    = require('vinyl-fs')
  , JSZip  = require('jszip')
  , _      = require('lodash')
  , cwd     = process.cwd() + '/'

function getAuth(cb) {
  //TODO: read ~/.mlpmrc, or something like that
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
  fs.writeFile('mlpm.json', JSON.stringify(data, null, 2), function(err) {
    if (err) return cb(err)
    cb(null)
  })
}

function savePackageFile(filePath, data, cb) {
  filePath = 'mlpm_modules' + filePath

  mkdirp(path.dirname(filePath), function (err) {
    if (err) return cb(err)

    fs.writeFile(filePath, data, function(err) {
      if (err) return cb(err)
      cb(null)
    })
  })
}

function getPackageGlobs(cb) {
  //TODO: read .mlpmignore, etc.
  process.nextTick(function() {
    cb(null, [
      '+(rest-api|src)/**/*.+(xq|xqy|xql|xqm|xsl|xslt)',
      '*.+(xq|xqy|xql|xqm|xsl|xslt)',
      'README.+(md|mdown)',
      'license.txt',
      'mlpm.json',
      '!**/mlpm_modules'
    ])
  })
}

function createZip(cb) {
  var zip = new JSZip()

  console.log('creating')

  getPackageGlobs(function(err, globs) {
    if (err) return cb(err)

    var src = vfs.src(globs)

    src.on('data', function(file) {
      var filePath = file.path.replace(cwd, '')
      zip.file( filePath, file.contents )
    })

    src.on('error', function(err) {
      cb(err)
    })

    src.on('end', function() {
      if ( _.keys( zip.files ).length === 0 ) {
        console.log('empty zip')
      } else {
        cb( null, zip.generate({type: 'nodebuffer'}) )
      }
    })
  })
}

function installPackage(err, buffer, obj) {
  if (err) return console.log(err)

  var zip = new JSZip(buffer)
  _.forIn(zip.files, function(contents, name) {
    var filePath = '/' + obj.package + '/' + name
    //console.log( 'mlpm_modules' + path )
    savePackageFile(filePath, contents, function(err) {
      if (err) return console.log(err)
      console.log('saved ' + filePath)
    })
  })
}

module.exports = {
  getAuth:         getAuth,
  getMlpm:         getMlpm,
  saveMlpm:        saveMlpm,
  getPackageGlobs: getPackageGlobs,
  createZip:       createZip,
  installPackage:  installPackage,
  savePackageFile: savePackageFile
}
