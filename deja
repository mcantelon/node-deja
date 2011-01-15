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

var valid_command = false

// deal with command line input
if (argv['_'].length < 1 || argv['_'].length > 2) {

  console.log(deja.usage())
  process.exit(1)
}
else if(argv['_'].length == 2) {

  var command = argv['_'][0]
  var param   = argv['_'][1]

  switch(command) {

    case 'clone':
      valid_command = true
      deja.cloneRepo(home, dejaHome, param)
      break

    case 'pull':
      valid_command = true
      deja.pullRepo(dejaHome, param)
      break

    case 'diff':
      valid_command = true
      deja.diffRepo(home, dejaHome, param)
      break

    case 'rm':
      valid_command = true
      deja.rmRepo(dejaHome, param)
      break
  }
}
else {

  var command = argv['_'][0]

  if (command == 'ls') {
    valid_command = true
    deja.ls(dejaHome)
  }
}

if (!valid_command) {
  console.log('Unrecognized command.')
}
