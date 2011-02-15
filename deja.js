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

iniparser.parse(home + '/.dejaconfig', function(err, data) {

  var config = (err) ? false : data

  var dejaHome = home + '/.deja'

  // make sure .deja exists in home directory
  try {
    fs.mkdirSync(dejaHome, 0700)
  } catch(e) {}

  var parser = new Parser()

  parser.addCommand('clone')
  .set('syntax', ['clone <repo>'])
  .set('logic', function(args) {
    deja.cloneRepo(home, dejaHome, args['repo'], config)
    return true
  })

  parser.addCommand('pull')
  .set('syntax', ['pull <repo>'])
  .set('logic', function(args) {
    deja.pullRepo(dejaHome, args['repo'])
    return true
  })

  parser.addCommand('diff')
  .set('syntax', ['diff <repo>'])
  .set('logic', function(args) {
    deja.diffRepo(home, dejaHome, args['repo'])
    return true
  })

  parser.addCommand('rm')
  .set('syntax', ['rm <repo>'])
  .set('logic', function(args) {
    deja.rmRepo(home, dejaHome, args['repo'])
    return true
  })

  parser.addCommand('link')
  .set('syntax', ['link <repo>'])
  .set('logic', function(args) {
    deja.linkRepo(home, dejaHome, args['repo'])
    return true
  })

  parser.addCommand('unlink')
  .set('syntax', ['unlink <repo>'])
  .set('logic', function(args) {
    deja.unlinkRepo(home, dejaHome, args['repo'])
    return true
  })

  parser.addCommand('ls')
  .set('syntax', ['ls', 'ls <repo>'])
  .set('logic', function(args) {
    var repoArg = (args['repo'])
      ? args['repo']
      : false

    deja.ls(home, dejaHome, repoArg)
    return true
  })

  parser.addCommand('update')
  .set('syntax', ['update'])
  .set('logic', function(args) {
    deja.updateRepos(home, dejaHome)
    return true
  })

  parser.addCommand('help')
  .set('syntax', ['help'])
  .set('logic', function(args) {
    console.log(deja.usage())
    return true
  })

  parser.addCommand('version')
  .set('syntax', ['version'])
  .set('logic', function(args) {
    console.log(deja.version())
    return true
  })

  if (!parser.parseLexemes(argv['_'])) {
    console.log('Unrecognized command.\n')
    parser.parse('help')
  }
})
