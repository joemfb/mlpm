'use strict';

var yargs = require('yargs')
  , _ = require('lodash')
  , cmds = []
  , args = {}
  , argv
  , usage
  , synonyms

// for each array, the first item must be the command filename in ./lib
// the following items are command synonyms
cmds = [
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

usage = 'mlpm <command>\n\n' +
        'where <command> is one of:\n    ' +
        'init, info, install, login, ls, ' +
        'publish, search, uninstall, unpublish, whoami'

argv = yargs
  .boolean('save')
  .boolean('h')
  .alias('h', 'help')
  .boolean('dryrun')
  .alias('dryrun', 'dry-run')
  .usage(usage)
  .argv

args = {
  usage: yargs.help,
  help: argv.help,
  dryrun: argv.dryrun,
  save: argv.save,
  argv: argv
}

synonyms = _.filter(cmds, function(arr) {
  return _.contains(arr, argv._[0])
})

if (synonyms.length === 1) {
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

module.exports = args
