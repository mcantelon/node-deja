/*!
* deja
* Copyright(c) 2011 Mike Cantelon
* MIT Licensed
*/

var path = require('path'),
  fs = require('fs'),
  spawn = require('child_process').spawn,
  wrench = require('wrench'),
  helpers = require('./deja_helpers')

exports.usage = function() {

  return "Usage:\n\
  deja clone <GIT REPO URL>\n\
  deja ls [REPO NAME][/SUBDIRECTORY]\n\
  deja pull <REPO NAME>\n\
  deja rm <REPO NAME>\n\
  deja diff <REPO NAME>\n\
  deja link <REPO NAME>[/SUBDIRECTORY]\n\
  deja unlink <REPO NAME>[/SUBDIRECTORY]\n\
  deja version"
}

exports.ls = function(home, dejaHome, repo) {

  var pathToRepo = dejaHome,
      subDir

  pathToRepo += (repo) ? '/' + repo : ''

  if (repo) {
    var repoAndSubDir = parseOutRepoAndSubdir(repo)
    subDir = repoAndSubDir.subDir
    subDir = (subDir != '')
      ? '/' + subDir
      : ''
  }

  path.exists(pathToRepo, function(exists) {

    if (exists) {
      helpers.traverseDir(pathToRepo, function(entry) {

        if (entry != '.git') {

          // if listing files in a repo, indicate if they are linked
          // from the corresponding home directory/subdirectory
          if (repo) {

            var entry_description = entry
            var pathToEntry = home + subDir + '/' + entry

            path.exists(pathToEntry, function(exists) {
              if (exists) {
                fs.lstat(pathToEntry, function(err, stats) {
                  if (stats.isSymbolicLink()) {

                    // get path link leads to
                    var destPath = fs.readlinkSync(pathToEntry)

                    if ((pathToRepo + '/' + entry) != destPath) {
                      entry_description += ' [unlinked]'
                    }
                  }
                  if (stats.isDirectory()) {
                    entry_description += ' [dir, conflicts]'
                  }
                  console.log(entry_description)
                })
              }
              else {
                fs.stat(pathToRepo + '/' + entry, function(err, stats) {

                  entry_description += ' ['
                  if (stats.isDirectory()) {
                    entry_description += 'dir, '
                  }
                  entry_description += 'unlinked]'
                  console.log(entry_description)
                })
              }
            })
          }
          else {

            console.log(entry)
          }
        }
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

  var basename = helpers.findUnusedBasename(dejaHome, repoUrl, function(basename) {

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

            // check if the repo has submodules
            path.exists(pathToRepo + '/.gitmodules', function(exists) {

              // if submodules found, initialize and update them
              if (exists) {

                console.log('Initializing and updating submodules...')
                process.chdir(pathToRepo)

                var submodules = spawn('git', ['submodule', 'update', '--init'])

                submodules.on('exit', function(code) {
                  // create symlinks to items in first level of repo directory
                  exports.linkRepo(home, dejaHome, basename)
                })
              }
              else {

                // create symlinks to items in first level of repo directory
                exports.linkRepo(home, dejaHome, basename)
              }
            })
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
    subDir = pathData.join('/')
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
  subDir += (subDir != '')
    ? '/'
    : ''

  var symlinkRootPath = home + '/' + subDir

  path.exists(symlinkRootPath, function(exists) {

    if (exists) {

      console.log('Creating symbolic links...')

      // cycle through cloned repo making symlinks to home
      helpers.traverseDir(pathToRepo, function(file) {

        if (file != '.git') {

          var filePath     = pathToRepo + '/' + file
          var symlinkPath  = symlinkRootPath + file

          helpers.createSymlinkIfPathExists(symlinkPath, filePath)
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

      helpers.deleteSymlinksToRepo(home, pathToRepo)
      wrench.rmdirSyncRecursive(pathToRepo)
      console.log('Repo removed.')
    }
    else {

      console.log('Error: Not a valid repo.')
    }
  })
}

exports.unlinkRepo = function(home, dejaHome, repo) {

  var pathToRepo = dejaHome + '/' + repo,
      subDir

  var repoAndSubDir = parseOutRepoAndSubdir(repo)
  subDir = repoAndSubDir.subDir
  subDir = (subDir != '')
    ? '/' + subDir
    : ''

  path.exists(pathToRepo, function(exists) {

    if (exists) {
      helpers.deleteSymlinksToRepo(home + subDir, pathToRepo)
    }
    else {
      console.log('Error: Not a valid repo.')
    }
  })
}

exports.diffRepo = function (home, dejaHome, repo) {

  var pathToRepo = dejaHome + '/' + repo,
      subDir

  var repoAndSubDir = parseOutRepoAndSubdir(repo)
  repo = repoAndSubDir.repo
  subDir = repoAndSubDir.subDir
  subDir = (subDir != '')
    ? '/' + subDir
    : ''

  path.exists(pathToRepo, function(exists) {

    if (exists) {

      path.exists(home + subDir, function(exists) {

        if (exists) {

          var diff = spawn('diff', [home + subDir, pathToRepo])

          diff.stdout.on('data', function (data) {
            console.log(data.toString())
          })
        }
        else {

          console.log('Error: Not a valid home directory.')
        }
      })
    }
    else {

      console.log('Error: Not a valid repo.')
    }
  })
}

exports.version = function() {

  var package_json = fs.readFileSync(__dirname + '/../package.json')
  var package_data = JSON.parse(package_json)
  return 'deja version ' + package_data.version
}
