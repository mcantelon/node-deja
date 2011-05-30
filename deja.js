#!/usr/bin/env node

/*!
* deja
* Copyright(c) 2011 Mike Cantelon
* MIT Licensed
*/

var fs = require('fs')
  , deja = require('./lib/deja')
  , mingy = require('mingy')
  , Parser = mingy.Parser
  , Command = mingy.Command
  , argv = require('optimist').argv
  , iniparser = require('iniparser')

var home = deja.getHomeEnvVarOrDie()

iniparser.parse(home + '/.gitconfig', function(err, data) {

  var config = (err) ? false : data

  var dejaHome = home + '/.deja'

  deja.whenDirectoryExists(dejaHome, function() {

    var commands = {

      'ls': {
        'syntax': ['ls', 'ls <repo>'],
        'logic': function(args) {
          var repoArg = (args['repo'])
            ? args['repo']
            : false

         deja.ls(home, dejaHome, repoArg)
          return true
        }
      },

      'clone': {
        'syntax': ['clone <repo>'],
        'logic': function(args) {
          deja.cloneRepo(home, dejaHome, args['repo'], config)
          return true
        }
      },

      'pull' : {
        'syntax': ['pull <repo>'],
        'logic': function(args) {
          deja.pullRepo(dejaHome, args['repo'])
          return true
        }
      },

      'diff': {
        'syntax': ['diff <repo>'],
        'logic': function(args) {
          deja.diffRepo(home, dejaHome, args['repo'])
          return true
        }
      },

      'rm': {
        'syntax': ['rm <repo>'],
        'logic': function(args) {
          deja.rmRepo(home, dejaHome, args['repo'])
          return true
        }
      },

      'link': {
        'syntax': ['link <repo>'],
        'logic': function(args) {
          deja.linkRepo(home, dejaHome, args['repo'])
          return true
        }
      },

      'unlink': {
        'syntax': ['unlink <repo>'],
        'logic': function(args) {
          deja.unlinkRepo(home, dejaHome, args['repo'])
         return true
        }
      },

      'help': {
        'syntax': ['help'],
        'logic': function(args) {
          console.log(deja.usage())
          return true
        }
      },

      'update': {
        'syntax': ['update'],
        'logic': function(args) {
          deja.updateRepos(home, dejaHome)
          return true
        }
      },

      'edit': {
        'syntax': ['edit <repoFilePath>'],
        'logic': function(args) {
          deja.editRepoFile(home, dejaHome, args['repoFilePath'])
          return true
        }
      },

      'version': {
        'syntax': ['version'],
        'logic': function(args) {
          console.log(deja.version())
          return true
        }
      }
    }

    parser = new Parser(commands)

    if (!parser.parseLexemes(argv['_'])) {
      console.log('Unrecognized command.\n')
      parser.parse('help')
    }
  })
})
