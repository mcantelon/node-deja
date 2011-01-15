#!/usr/bin/env node
var sys = require('sys'),
  path = require('path'),
  fs = require('fs'),
  spawn = require('child_process').spawn,
  wrench = require('wrench'),
  deja = require('./lib/deja')
  argv = require('optimist')
    .default('c', './cable')
    .argv

var home = process.env.HOME

// if HOME not set, die
if (home == undefined) {
  console.log('Error: HOME environmental variable not defined.')
  process.exit(1)
}

var dejaHome = home + '/.deja'

// make sure .deja exists in home directory
try {
  fs.mkdirSync(dejaHome, 0700)
} catch(e) {}

// deal with command line input
if (argv['_'].length < 1 || argv['_'].length > 2) {

  invalid_command() 
}
else if(argv['_'].length == 2) {

  var command = argv['_'][0]
  var param   = argv['_'][1]

  switch(command) {

    case 'clone':
      deja.cloneRepo(home, dejaHome, param)
      break

    case 'pull':
      deja.pullRepo(dejaHome, param)
      break

    case 'diff':
      deja.diffRepo(home, dejaHome, param)
      break

    case 'rm':
      deja.rmRepo(dejaHome, param)
      break

    default:
      invalid_command()
  }
}
else {

  var command = argv['_'][0]

  switch(command) {

    case 'ls':
      deja.ls(dejaHome)
      break

    case 'help':
      console.log(deja.usage())
      break

    default:
      invalid_command()
  }
}

function invalid_command() {
  console.log('Unrecognized command.')

  console.log(deja.usage())
  process.exit(1)
}
