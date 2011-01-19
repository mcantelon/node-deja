var assert = require('assert'),
    should = require('should'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    path = require('path')

TESTING_DIR = '/tmp/dejaTest'

function testing_setup(testingDir) {

  // if temp dir exists, delete contents
  path.exists(testingDir, function(exists) {

    // if the testing directory is already here, remove it
    if (exists) {
      spawn('rm', ['-r', '-f', testingDir])
    }

    // make testing directory
    fs.mkdirSync(testingDir, 0777)

    // if testing directory doesn't now exit, abort testing
    path.exists(testingDir, function(exists) {

      if (!exists) {
        console.log('Error: could not create testing directory.')
        error(1)
      }
    })
  })
}

function testing_teardown(testingDir) {

  path.exists(testingDir, function(exists) {

    // if the testing directory is already here, remove it
    if (exists) {
      spawn('rm', ['-r', '-f', testingDir])
    }
  })
}

function spawnInTestHome(command, args, testingDir) {

  process.env.HOME = testingDir
  return spawn(command, args, {env: process.env})
}

module.exports = {
  'test .deja dir  creation': function() {
    var testingDir = TESTING_DIR + '_a'
    testing_setup(testingDir)
    var deja = spawnInTestHome('deja', [], testingDir)
    deja.on('exit', function(code) {
      path.exists(testingDir + '/.deja', function(exists) {
        testing_teardown(testingDir)
        exists.should.equal(true)
      })
    })
  },

  'test git clone': function() {
    var testingDir = TESTING_DIR + '_b'
    testing_setup(testingDir)
    var dejaArgs = ['clone', 'git://github.com/mcantelon/dotfiles.git']
    var deja = spawnInTestHome('deja', dejaArgs, testingDir)
    deja.on('exit', function(code) {
      path.exists(testingDir + '/.deja/dotfiles', function(exists) {
        testing_teardown(testingDir)
        exists.should.equal(true)
      })
    })
  }
}
