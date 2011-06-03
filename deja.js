#!/usr/bin/env node

/*!
* deja
* Copyright(c) 2011 Mike Cantelon
* MIT Licensed
*/

var fs = require('fs')
  , helpers = require('./lib/helpers')
  , commands = require('./lib/commands')
  , mingy = require('mingy')
  , Parser = mingy.Parser
  , Command = mingy.Command
  , argv = require('optimist').argv
  , iniparser = require('iniparser')

var home = helpers.getHomeEnvVarOrDie()

iniparser.parse(home + '/.gitconfig', function(err, data) {

  var config = (err) ? false : data

  var dejaHome = home + '/.deja'

  helpers.whenDirectoryExists(dejaHome, function() {

    var command_syntax = {

      'ls': {
        'syntax': ['ls', 'ls <repo>'],
        'logic': function(args) {
          var repoArg = (args['repo'])
            ? args['repo']
            : false

         commands.ls(home, dejaHome, repoArg)
          return true
        }
      },

      'clone': {
        'syntax': ['clone <repo>'],
        'logic': function(args) {
          commands.cloneRepo(home, dejaHome, args['repo'], config)
          return true
        }
      },

      'pull' : {
        'syntax': ['pull <repo>'],
        'logic': function(args) {
          commands.pullRepo(dejaHome, args['repo'])
          return true
        }
      },

      'diff': {
        'syntax': ['diff <repo>'],
        'logic': function(args) {
          commands.diffRepo(home, dejaHome, args['repo'])
          return true
        }
      },

      'rm': {
        'syntax': ['rm <repo>'],
        'logic': function(args) {
          commands.rmRepo(home, dejaHome, args['repo'])
          return true
        }
      },

      'link': {
        'syntax': ['link <repo>'],
        'logic': function(args) {
          commands.linkRepo(home, dejaHome, args['repo'])
          return true
        }
      },

      'unlink': {
        'syntax': ['unlink <repo>'],
        'logic': function(args) {
          commands.unlinkRepo(home, dejaHome, args['repo'])
         return true
        }
      },

      'help': {
        'syntax': ['help'],
        'logic': function(args) {
          console.log(commands.usage())
          return true
        }
      },

      'update': {
        'syntax': ['update'],
        'logic': function(args) {
          commands.updateRepos(home, dejaHome)
          return true
        }
      },

      'edit': {
        'syntax': ['edit <repoFilePath>'],
        'logic': function(args) {
          commands.editRepoFile(dejaHome, args['repoFilePath'])
          return true
        }
      },

      'explore': {
        'syntax': ['explore <repo>', 'go <repo>'],
        'logic': function(args) {
          commands.exploreRepo(dejaHome, args['repo'])
          return true
        }
      },

      'cheat': {
        'syntax': ['cheat <name>'],
        'logic': function(args) {
          commands.editCheat(dejaHome, args['name'])
          return true
        }
      },

      'version': {
        'syntax': ['version'],
        'logic': function(args) {
          console.log(commands.version())
          return true
        }
      }
    }

    parser = new Parser(command_syntax)

    // allow -v or --version shortcut for viewing version
    argv['_'] = (argv['v'] || argv['version']) ? ['version'] : argv['_']

    if (!parser.parseLexemes(argv['_'])) {
      console.log('Unrecognized command.\n')
      parser.parse('help')
    }
  })
})
