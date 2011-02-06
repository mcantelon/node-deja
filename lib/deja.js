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

exports.getHomeEnvVarOrDie = function() {

  var home = process.env.HOME

  if (home === undefined) {
    console.log('Error: HOME environmental variable not defined.')
    process.exit(1)
  }

  return home
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

          // if listing files in a repo, output status info for each file
          (repo)
            ? helpers.outputEntryAndInfo(entry, pathToRepo, home + subDir + '/' + entry)
            : console.log(entry)
        }
      })
    }
    else {
      console.log('Error: directory not found.')
    }
  })
}

exports.cloneRepo = function(home, dejaHome, repoUrl, config) {

  config = config || {}

  // allow user to leave off .git or .git/
  if (repoUrl.indexOf('.git') == -1) {
    repoUrl = repoUrl + '.git'
  }

  // default to Github if protocal not specified
  if (repoUrl.indexOf(':') == -1) {
    // if "username/repo" format not used, get from config
    if (repoUrl.indexOf('/') == -1) {

      if (config.github_user) {

        repoUrl = 'git@github.com:' + config.github_user + '/' + repoUrl
      }
      else {

        console.log('Error: Github repo name only specified, but no github_user defined in .dejaconfig.')
        process.exit(1)
      }
    }
    else {

      repoUrl = 'git://github.com/' + repoUrl
    }
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

exports.getIgnoreList = function(home, repo, callback) {

  var ignoreFilename = '.dejaignore'
    , pathToGlobalIgnore = home + '/' + ignoreFilename
    , pathToRepoIgnore = home + '/.deja/' + repo + '/' + ignoreFilename
    , homeIgnoreList
    , repoIgnoreList
    , ignoreList

  path.exists(pathToGlobalIgnore, function(exists) {

    if (exists) {

      homeIgnoreList = exports.readIgnoreListFromFile(pathToGlobalIgnore)
    }

    path.exists(pathToRepoIgnore, function(exists) {

      if (exists) {

        repoIgnoreList = exports.readIgnoreListFromFile(pathToRepoIgnore)
      }

      // merge two ignore lists
      ignoreList = homeIgnoreList || []

      if (repoIgnoreList) {
        for(var index in repoIgnoreList) {
          var ignoreItem = repoIgnoreList[index]
          if (ignoreList.indexOf(ignoreItem) == -1) {
            ignoreList.push(ignoreItem)
          }
        }
      }

      callback(ignoreList)
    })
  })
}

exports.readIgnoreListFromFile = function(file) {

console.log(file)
  var lines = fs.readFileSync(file).toString().split("\n")
    , ignoreList = []
    , line

  for (var index in lines) {

    line = lines[index]

    // if line contains a comment, trim it off
    if (line.indexOf('#') != -1) {
      line = line.slice(0, line.indexOf('#'))
    }

    // trim blank space from start/end of line
    line = line.replace(/^\s*/, '').replace(/\s*$/, '')

    // change file pattern to regex
    line = line.replace('*', '(*)')

    // if pattern doesn't exist in ignore list, add it
    if (line != '' && ignoreList.indexOf(line) == -1) {
      ignoreList.push(line)
    }
  }

  return ignoreList
}
