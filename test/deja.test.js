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
      var rm = spawn('rm', ['-r', '-f', testingDir])

      rm.on('exit', function(code) {

        makeTestDirectory(testingDir)
      })
    }
    else {

      makeTestDirectory(testingDir)
    }
  })
}

function makeTestDirectory(testingDir) {

  // make testing directory
  fs.mkdirSync(testingDir, 0777)

  // if testing directory doesn't now exit, abort testing
  path.exists(testingDir, function(exists) {

    if (!exists) {
      console.log('Error: could not create testing directory.')
      error(1)
    }
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

function doClone(testingDir, repoBaseName, repoUrl, exists_callback) {

  var dejaArgs = ['clone', repoUrl]
  var deja = spawnInTestHome('deja', dejaArgs, testingDir)
  deja.on('exit', function(code) {
    path.exists(testingDir + '/.deja/' + repoBaseName + '/.git', exists_callback)
  })
}

function testClone(testingDir, repoBaseName, repoUrl) {

  doClone(testingDir, repoBaseName, repoUrl, function(exists) {
    testing_teardown(testingDir)
    exists.should.equal(true)
  })
}

module.exports = {
  'test .deja dir creation': function() {
    var testingDir = TESTING_DIR + '_a'
    testing_setup(testingDir)
    var deja = spawnInTestHome('deja', ['help'], testingDir)
    deja.on('exit', function(code) {
      if (code == 0) {
        path.exists(testingDir + '/.deja', function(exists) {
          testing_teardown(testingDir)
          exists.should.equal(true)
        })
      }
      else {
        console.log('Error: error return while running "deja help".')
        process.exit(1)
      }
    })
  },

  'test deja clone': function() {
    var testingDir = TESTING_DIR + '_b'
    testing_setup(testingDir)
    testClone(testingDir, 'dotfiles', 'git://github.com/mcantelon/dotfiles.git')
  },

  'test deja clone with shortform': function() {
    var testingDir = TESTING_DIR + '_c'
    testing_setup(testingDir)
    testClone(testingDir, 'dotfiles', 'mcantelon/dotfiles')
  },

  'test deja rm': function() {
    var testingDir = TESTING_DIR + '_d'
    testing_setup(testingDir)
    doClone(testingDir, 'dotfiles', 'mcantelon/dotfiles', function(exists) {
      if (exists) {
        var deja = spawnInTestHome('deja', ['rm', 'dotfiles'], testingDir)
        deja.on('exit', function(code) {
          path.exists(testingDir + '/.deja/dotfiles', function(exists) {
            testing_teardown(testingDir)
            // the repo should have been deleted by "deja rm dotfiles"
            exists.should.equal(false)
          })
        })
      }
      else {

        console.log('Error: clone failed.')
        exit(1)
      }
    })
  },

  'test deja ls': function() {
    var testingDir = TESTING_DIR + '_e'
    testing_setup(testingDir)
    doClone(testingDir, 'dotfiles', 'mcantelon/dotfiles', function(exists) {
      if (exists) {
        var deja = spawnInTestHome('deja', ['ls'], testingDir)
        deja.stdout.on('data', function(data) {
          testing_teardown(testingDir)
          data.toString().should.equal("dotfiles\n")
        })
      }
      else {

        console.log('Error: clone failed.')
        exit(1)
      }
    })
  },

  'test deja link': function() {
    var testingDir = TESTING_DIR + '_f'
    testing_setup(testingDir)
    doClone(testingDir, 'dotfiles', 'mcantelon/dotfiles', function(exists) {
      if (exists) {
        var deja = spawnInTestHome('deja', ['link', 'dotfiles'], testingDir)
        deja.on('exit', function(code) {
          code.should.equal(0)

          fs.lstat(testingDir + '/.vimrc', function(err, stats) {
            stats.isSymbolicLink().should.equal(true)
            //testing_teardown(testingDir)
          })
        })
      }
      else {

        console.log('Error: clone failed.')
        exit(1)
      }
    })
  }
}
