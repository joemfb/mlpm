'use strict';

var yargs = require('yargs')
  , _ = require('lodash')

// for each array, the first item must be the command filename in ./lib
// the following items are command synonyms
var cmds = [
  ['deploy'],
  ['info', 'v', 'show', 'view'],
  ['init', 'new'],
  ['install', 'i', 'isntall'],
  ['login', 'adduser', 'add-user'],
  ['ls'],
  ['publish'],
  ['search'],
  ['uninstall', 'rm', 'unisntall'],
  ['unpublish'],
  ['whoami']
]

var usage = 'mlpm <command>\n\n' +
            'where <command> is one of:\n    ' +
            'deploy, init, info, install, login, ls, ' +
            'publish, search, uninstall, unpublish, whoami'

var argv = yargs
  .boolean('h')
  .alias('h', 'help')
  // install
  .boolean('save')
  // unpublish
  .boolean('f')
  .alias('f', 'force')
  // publish
  .boolean('dryrun')
  .alias('dryrun', 'dry-run')
  // deploy
  .alias('H', 'host')
  .alias('P', 'port')
  .alias('u', 'username')
  .alias('user', 'username')
  .alias('p', 'password')
  .usage(usage)
  .argv

function parse() {
  var args = {
    usage: yargs.help,
    help: argv.help,
    force: argv.force,
    dryrun: argv.dryrun,
    save: argv.save,
    host: argv.host,
    port: argv.port,
    username: argv.username,
    password: argv.password,
    argv: argv
  }

  var synonyms = _.filter(cmds, function(arr) {
    return _.contains(arr, argv._[0])
  })

  if ( synonyms.length === 1 ) {
   args.command = synonyms[0][0]
  } else {
    args.unknown = argv._[0]
  }

  switch( args.command ) {
    case 'search':
      args.query = argv._.splice(1).join(' ')
      break
    case 'login':
      args.token = argv._[1]
      break
    default:
      // TODO: match package(@version)? with regex?
      if ( argv._[1] ) {
        args.package = argv._[1].split('@')[0]
        args.version = argv._[1].split('@')[1]
      }
  }

  return args
}

module.exports = {
  cmds: cmds,
  parse: parse
}
