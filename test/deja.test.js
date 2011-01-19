var assert = require('assert'),
    should = require('should'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    path = require('path'),
    wrench = require('wrench')

TESTING_DIR = '/tmp/dejaTest'

function testing_setup(testingDir) {

  // if temp dir exists, delete contents
  path.exists(testingDir, function(exists) {

    // if the testing directory is already here, remove it
    if (exists) {
      wrench.rmdirSyncRecursive(testingDir)
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
      wrench.rmdirSyncRecursive(testingDir)
    }
  })
}

module.exports = {
  'test .deja dir  creation': function() {
    testing_setup(TESTING_DIR)
    process.env.HOME = TESTING_DIR
    var deja = spawn('deja', [], {env: process.env})
    deja.on('exit', function(code) {
      path.exists(TESTING_DIR + '/.deja', function(exists) {
        testing_teardown(TESTING_DIR)
        exists.should.equal(true)
      })
    })
  }
}
