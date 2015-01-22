'use strict';

var yargs = require('yargs')
  , _ = require('lodash')
  , cmds = [
      ['info', 'v', 'show', 'view'],
      ['init', 'new'],
      ['install', 'i', 'isntall'],
      ['ls'],
      ['publish'],
      ['search'],
      ['uninstall', 'rm', 'unisntall'],
      ['unpublish']
    ]
  , args = {}
  , argv
  , usage

function normalizeCommand(command) {
  var synonyms = _.filter(cmds, function(arr) {
    return _.contains(arr, command)
  })

  return (synonyms.length === 1) ? synonyms[0][0] : command
}

usage = 'mlpm <command>\n\n' +
        'where <command> is one of:\n    ' +
        'init, info, install, ls, publish, ' +
        'search, uninstall, unpublish'

argv = yargs
  .boolean('save')
  .boolean('h')
  .alias('h', 'help')
  .usage(usage)
  .argv

args.usage = yargs.help
args.help = argv.help
args.save = argv.save
args.argv = argv

if ( argv._[0] ) {
  args.command = normalizeCommand(argv._[0])
}

if ( args.command === 'search' ) {
  args.query = argv._.splice(1).join(' ')
  // TODO: match package(@version)? with regex?
} else if ( argv._[1] ) {
  args.package = argv._[1].split('@')[0]
  args.version = argv._[1].split('@')[1]
}

module.exports = args
