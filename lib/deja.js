#!/usr/bin/env node
var sys = require('sys'),
  path = require('path'),
  fs = require('fs'),
  spawn = require('child_process').spawn,
  wrench = require('wrench')

exports.usage = function() {

  return "Usage: \n\
deja clone <GIT REPO URL>\n\
deja ls\n\
deja pull <REPO NAME>\n\
deja rm <REPO NAME>\n\
deja diff <REPO NAME>"
}

function traverseDir(dir, callback) {

  children = fs.readdirSync(dir)

  for(var index in children) {
    callback(children[index])
  }
}

function createSymlink(symlinkPath, filepath) {

  path.exists(filepath, function(exists) {

    if (!exists) {

      console.log(symlinkPath + ' -> ' + filepath)
      fs.symlinkSync(symlinkPath, filepath)
    }
    else {

      console.log('Skipped ' + filepath + ': already exists.')
    }
  })
}

function diffIfNotSymbolicLink(home, repoHome, file) {

  var homeFilePath = home + '/' + file
  var repoFilePath = repoHome + '/' + file

  fs.lstat(homeFilePath, function(err, stats) {
    if (!stats.isSymbolicLink()) {

      var diff = spawn('diff', [homeFilePath, repoFilePath])

      diff.stdout.on('data', function (data) {
        sys.puts('diff ' + homeFilePath + ' ' + repoFilePath)
        sys.print(data + "\n")
      })
    }
  })
}

exports.ls = function(dejaHome) {

  traverseDir(dejaHome, function(entry) {
    console.log(entry)
  })
}

exports.cloneRepo = function(home, dejaHome, repoUrl) {

  // allow user to leave off .git or .git/
  if (repoUrl.indexOf('.git') == -1) {
    repoUrl = repoUrl + '.git'
  }

  // default to Github if protocal not specified
  if (repoUrl.indexOf(':') == -1) {
    repoUrl = 'git://github.com/' + repoUrl
  }

  var basename = path.basename(repoUrl)
  var destination = dejaHome + '/' + basename

  path.exists(destination, function(exists) {

    if (exists) {

      console.log('Error: Repo already exists.')
      process.exit(1)
    }
    else {

      var clone = spawn('git', ['clone', repoUrl, destination])

      clone.on('exit', function(code) {

        if (code != 0) {

          console.log('Error: could not clone.')
          process.exit(code)
        }
        else {

          // cycle through cloned repo making symlinks to home
          traverseDir(destination, function(file) {

            if (file != '.git') {

              var symlinkPath = destination + '/' + file
              var filepath = home + '/' + file

              createSymlink(symlinkPath, filepath)
            }
          })
        }
      })
    }
  })
}

exports.pullRepo = function (dejaHome, repo) {

  var destination = dejaHome + '/' + repo

  path.exists(destination, function(exists) {

    if (exists) {

      process.chdir(destination)

      var pull = spawn('git', ['pull'])

      pull.on('exit', function(code) {

        console.log((code == 0)
          ? 'Pull complete.'
          : 'Error: Could not pull.'
        )

        process.exit(code)
      })
    }
    else {

      console.log('Error: Not a valid repo.')
    }
  })
}

exports.rmRepo = function(home, dejaHome, repo) {

  var destination = dejaHome + '/' + repo

  path.exists(destination, function(exists) {

    if (exists) {

      traverseDir(destination, function(entry) {

        var pathToEntry = home + '/' + entry

        path.exists(pathToEntry, function(exists) {
          if (exists) {
            fs.lstat(pathToEntry, function(err, stats) {
              if (stats.isSymbolicLink()) {

                // get path link leads to 
                var destPath = fs.readlinkSync(pathToEntry)

                if (destPath == destination + '/' + entry) {

                  fs.unlink(pathToEntry, function (err) {
                    if (err) {
                      console.log ('Error: Could not delete symlink ' + pathToEntry + '.')
                    }
                    else {
                      console.log('Deleted symlink ' + pathToEntry + '.')
                    }
                  })
                }
              }
            })
          }
        })
      })

      wrench.rmdirSyncRecursive(destination)
      console.log('Repo removed.')
    }
    else {

      console.log('Error: Not a valid repo.')
    }
  })
}

exports.diffRepo = function (home, dejaHome, param) {

  var destination = dejaHome + '/' + param

  path.exists(destination, function(exists) {

    if (exists) {

      traverseDir(destination, function(file) {
        if (file != '.git') {
          diffIfNotSymbolicLink(home, destination, file)
        }
      })
    }
    else {

      console.log('Error: Not a valid repo.')
    }
  })
}
