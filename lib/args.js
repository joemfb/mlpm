'use strict';

var yargs = require('yargs')
  , _     = require('lodash')
  , argv  = yargs.argv
  , args  = {}
  , cmds  = [
      ['info', 'v', 'show', 'view'],
      ['init', 'new'],
      ['install', 'i', 'isntall'],
      ['publish'],
      ['search']
    ]
  , usage

function normalizeCommand(command) {
  var synonyms = _.filter(cmds, function(arr) {
        return arr.indexOf(command) > -1
      })

  if (synonyms.length === 1) {
    command = synonyms[0][0]
  }
  return command
}

usage = 'mlpm <command>\n\n' +
        'where <command> is one of:\n' +
        '    init, info, install, publish, search'
yargs
  .boolean('save')
  .boolean('help')
  .alias('h', 'help')
  .usage(usage)

args = {
  usage: yargs.help,
  save: argv.save,
  argv: argv
}

if ( argv._[0] ) {
  args.command = normalizeCommand(argv._[0])
}

if ( args.command === 'search' ) {
  args.query = argv._.splice(1).join(' ')
} else if ( argv._[1] ) {
  args.package = argv._[1].split('@')[0]
  args.version = argv._[1].split('@')[1]
}

module.exports = args
