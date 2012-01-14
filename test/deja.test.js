var assert = require('assert')
  , should = require('should')
  , spawn = require('child_process').spawn
  , fs = require('fs')
  , path = require('path')

var TESTING_DIR = '/tmp/dejaTest'

function testingSetup(testingDir, callback) {

  // if temp dir exists, delete contents
  path.exists(testingDir, function(exists) {

    // if the testing directory is already here, remove it
    if (exists) {
      var rm = spawn('rm', ['-r', '-f', testingDir])

      rm.on('exit', function(code) {

        makeTestDirectory(testingDir, callback)
      })
    }
    else {

      makeTestDirectory(testingDir, callback)
    }
  })
}

function makeTestDirectory(testingDir, callback) {

  // make testing directory
  fs.mkdirSync(testingDir, 0777)

  // if testing directory doesn't now exit, abort testing
  path.exists(testingDir, function(exists) {

    if (!exists) {
      console.log('Error: could not create testing directory.')
      error(1)
    }
    else {
      callback()
    }
  })
}

function testing_teardown(testingDir, callback) {

  path.exists(testingDir, function(exists) {

    // if the testing directory is already here, remove it
    if (exists) {
      var rm = spawn('rm', ['-r', '-f', testingDir])

      rm.on('exit', function(code) {
        if (callback) {
          callback()
        }
      })
    }
    else {
      if (callback) {
        callback()
      }
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

function doMockClone(testingDir, repoBaseName, exists_callback) {

  var pathToDeja = testingDir + '/.deja'

  // make deja directory
  fs.mkdirSync(pathToDeja, 0777)

  path.exists(pathToDeja, function(exists) {
    exists.should.equal(true)

    var pathToMockRepo = pathToDeja + '/' + repoBaseName

    // make mock repo directory
    fs.mkdirSync(pathToMockRepo, 0777)

    path.exists(pathToMockRepo, function(exists) {
      exists.should.equal(true)

      var pathToMockGitDir = pathToMockRepo + '/.git'

      // stick fake .git dir in fake repo
      fs.mkdirSync(pathToMockGitDir, 0777)

      path.exists(pathToMockGitDir, function(exists) {
        exists.should.equal(true)

        var pathToFakeVimrc = pathToMockRepo + '/.vimrc'
        var touch = spawn('touch', [pathToFakeVimrc])

        touch.on('exit', function(code) {
          path.exists(pathToFakeVimrc, exists_callback)
        })
      })
    })
  })
}

function testClone(testingDir, repoBaseName, repoUrl, cb) {
  doClone(testingDir, repoBaseName, repoUrl, function(exists) {
    exists.should.equal(true)
    cb();
  })
}

function testCloneThenTeardown(testingDir, repoBaseName, repoUrl) {

  doClone(testingDir, repoBaseName, repoUrl, function(exists) {
    exists.should.equal(true)
    testing_teardown(testingDir)
  })
}

describe('deja', function() {
  beforeEach(function(done) {
    testingSetup(TESTING_DIR, done)
  })

  afterEach(function(done) {
    testing_teardown(TESTING_DIR, done)
  })

  it('should be able to create a .deja directory', function(done) {
    var deja = spawnInTestHome('deja', ['help'], TESTING_DIR)
    deja.on('exit', function(code) {
      code.should.equal(0)
      if (code == 0) {
        path.exists(TESTING_DIR + '/.deja', function(exists) {
          exists.should.equal(true)
          done()
        })
      }
    })
  })

  it('should be able to clone a git repo', function(done) {
    testClone(TESTING_DIR, 'dotfiles', 'git://github.com/mcantelon/dotfiles.git', function() {
      done()
    })
  })

  it('should be able to clone a github repo using shorthand', function(done) {
    testClone(TESTING_DIR, 'dotfiles', 'mcantelon/dotfiles', function() {
      done()
    })
  })

  it('should be able to remove repo it has cloned', function(done) {
    doMockClone(TESTING_DIR, 'dotfiles', function(exists) {
      exists.should.equal(true)
      if (exists) {
        var deja = spawnInTestHome('deja', ['rm', 'dotfiles'], TESTING_DIR)
        deja.on('exit', function(code) {
          path.exists(TESTING_DIR + '/.deja/dotfiles', function(exists) {
            // the repo should have been deleted by "deja rm dotfiles"
            exists.should.equal(false)
            done()
          })
        })
      }
    })
  })

  it('should be able to list a directory', function(done) {
    doMockClone(TESTING_DIR, 'dotfiles', function(exists) {
      exists.should.equal(true)
      if (exists) {
        var deja = spawnInTestHome('deja', ['ls'], TESTING_DIR)
        deja.stdout.on('data', function(data) {
          data.toString().should.equal("dotfiles\n")
          done()
        })
      }
    })
  })

  it('should be able to create a symlink', function(done) {
    doMockClone(TESTING_DIR, 'dotfiles', function(exists) {
      exists.should.equal(true)
      if (exists) {
        var deja = spawnInTestHome('deja', ['link', 'dotfiles'], TESTING_DIR)
        deja.on('exit', function(code) {
          code.should.equal(0)
          fs.lstat(TESTING_DIR + '/.vimrc', function(err, stats) {
            stats.isSymbolicLink().should.equal(true)
            done()
          })
        })
      }
    })
  })

  it('should be able to remove a symlink', function(done) {
    doMockClone(TESTING_DIR, 'dotfiles', function(exists) {
      exists.should.equal(true)
      if (exists) {
        var deja = spawnInTestHome('deja', ['link', 'dotfiles'], TESTING_DIR)
        deja.on('exit', function(code) {
          code.should.equal(0)
          fs.lstat(TESTING_DIR + '/.vimrc', function(err, stats) {
            stats.isSymbolicLink().should.equal(true)

            var deja = spawnInTestHome('deja', ['unlink', 'dotfiles'], TESTING_DIR)
            deja.on('exit', function(code) {
              code.should.equal(0)

              fs.lstat(TESTING_DIR + '/.vimrc', function(err, stats) {
                assert.equal(stats, undefined)
                done()
              })
            })
          })
        })
      }
    })
  })

  it(
    'should be able to handle duplicate repo names by padding destination names', function(done) {
    var repoUrl = 'mcantelon/dotfiles'
    doClone(TESTING_DIR, 'dotfiles', repoUrl, function(exists) {
      exists.should.equal(true)
      if (exists) {
        var dejaArgs = ['clone', repoUrl]
        var deja = spawnInTestHome('deja', dejaArgs, TESTING_DIR)
        deja.on('exit', function(code) {
          // deja should have padding the repo name as it's a duplicate
          path.exists(TESTING_DIR + '/.deja/dotfiles_1/.git', function(exists) {
            exists.should.equal(true)
            done()
         })
        })
      }
    })
  })
})
