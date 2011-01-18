var path = require('path'),
  fs = require('fs'),
  spawn = require('child_process').spawn,
  wrench = require('wrench')

exports.usage = function() {

  return "Usage:\n\
  deja clone <GIT REPO URL>\n\
  deja ls [REPO NAME]\n\
  deja pull <REPO NAME>\n\
  deja rm <REPO NAME>\n\
  deja diff <REPO NAME>\n\
  deja link <REPO NAME>\n\
  deja unlink <REPO NAME>"
}

function traverseDir(dir, callback) {

  children = fs.readdirSync(dir)

  for(var index in children) {
    callback(children[index])
  }
}

function findUnusedBasename(dejaHome, repoUrl, callback, counter) {

  counter = (counter == undefined) ? 0 : counter

  // strip ".git" and pad with counter if the basename's already been used
  var basename = path.basename(repoUrl, '.git')
  basename += (counter > 0) ? '_' + counter : ''

  path.exists(dejaHome + '/' + basename, function(exists) {

    if (exists) {
      // recurse, increasing counter, if basename has already been used
      findUnusedBasename(dejaHome, repoUrl, callback, counter + 1)
    }
    else {
      // provide callback with unused basename
      callback(basename)
    }
  })
}

function createSymlinkIfPathExists(symlinkPath, filePath) {

  path.exists(symlinkPath, function(exists) {

    if (!exists) {

      console.log('  ' + symlinkPath + ' -> ' + filePath)
      fs.symlinkSync(filePath, symlinkPath)
    }
    else {

      console.log('  Skipped ' + filePath + ': already exists.')
    }
  })
}

function deleteSymlinksToRepo(home, pathToRepo) {

  traverseDir(pathToRepo, function(entry) {

    var pathToEntry = home + '/' + entry

    path.exists(pathToEntry, function(exists) {
      if (exists) {
        fs.lstat(pathToEntry, function(err, stats) {
          if (stats.isSymbolicLink()) {

            // get path link leads to 
            var destPath = fs.readlinkSync(pathToEntry)

            if (destPath == pathToRepo + '/' + entry) {

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
}

function diffIfNotSymbolicLink(home, repoHome, file) {

  var homeFilePath = home + '/' + file
  var repoFilePath = repoHome + '/' + file

  fs.lstat(homeFilePath, function(err, stats) {
    if (!stats.isSymbolicLink()) {

      var diff = spawn('diff', [homeFilePath, repoFilePath])

      diff.stdout.on('data', function (data) {
        console.log('diff ' + homeFilePath + ' ' + repoFilePath)
        console.log(data.toString())
      })
    }
  })
}

exports.ls = function(dir) {

  path.exists(dir, function(exists) {

    if (exists) {
      traverseDir(dir, function(entry) {
        console.log(entry)
      })
    }
    else {
      console.log('Error: directory not found.')
    }
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

  var basename = findUnusedBasename(dejaHome, repoUrl, function(basename) {

    var pathToRepo = dejaHome + '/' + basename

    path.exists(pathToRepo, function(exists) {

      if (exists) {

        console.log('Error: Repo already exists.')
        process.exit(1)
      }
      else {

        console.log('Cloning repository...')

        var clone = spawn('git', ['clone', repoUrl, pathToRepo])

        clone.on('exit', function(code) {

          if (code != 0) {

            console.log('Error: could not clone.')
            process.exit(code)
          }
          else {
            exports.linkRepo(home, dejaHome, basename)
          }
        })
      }
    })
  })
}

function parseOutRepoAndSubdir(repo) {

  var pathData,
      subDir = ''

  // if repo contains slashes, then user wants to link a repo subdirectory
  if (repo.indexOf('/') != -1) {

    pathData = repo.split('/')
    repo = pathData.shift()
    subDir = pathData.join('/') + '/'
  }

  return {
    repo:   repo,
    subDir: subDir
  }
}

exports.linkRepo = function(home, dejaHome, repo) {

  var pathToRepo = dejaHome + '/' + repo,
      subDir

  var repoAndSubDir = parseOutRepoAndSubdir(repo)
  repo = repoAndSubDir.repo
  subDir = repoAndSubDir.subDir

  var symlinkRootPath = home + '/' + subDir

  path.exists(symlinkRootPath, function(exists) {

    if (exists) {

      console.log('Creating symbolic links...')

      // cycle through cloned repo making symlinks to home
      traverseDir(pathToRepo, function(file) {

        if (file != '.git') {

          var filePath     = pathToRepo + '/' + file
          var symlinkPath  = symlinkRootPath + file

          createSymlinkIfPathExists(symlinkPath, filePath)
        }
      })
    }
    else {

      console.log('Error: Not a valid repo.')
    }
  })
}

exports.pullRepo = function (dejaHome, repo) {

  var pathToRepo = dejaHome + '/' + repo

  path.exists(pathToRepo, function(exists) {

    if (exists) {

      console.log('Pulling...')

      process.chdir(pathToRepo)

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

  var pathToRepo = dejaHome + '/' + repo

  path.exists(pathToRepo, function(exists) {

    if (exists) {

      deleteSymlinksToRepo(home, pathToRepo)
      wrench.rmdirSyncRecursive(pathToRepo)
      console.log('Repo removed.')
    }
    else {

      console.log('Error: Not a valid repo.')
    }
  })
}

exports.unlinkRepo = function(home, dejaHome, repo) {

  var pathToRepo = dejaHome + '/' + repo

  path.exists(pathToRepo, function(exists) {

    if (exists) {
      deleteSymlinksToRepo(home, pathToRepo)
    }
    else {
      console.log('Error: Not a valid repo.')
    }
  })
}

exports.diffRepo = function (home, dejaHome, param) {

  var pathToRepo = dejaHome + '/' + param

  path.exists(pathToRepo, function(exists) {

    if (exists) {

      traverseDir(pathToRepo, function(file) {
        if (file != '.git') {
          diffIfNotSymbolicLink(home, pathToRepo, file)
        }
      })
    }
    else {

      console.log('Error: Not a valid repo.')
    }
  })
}
