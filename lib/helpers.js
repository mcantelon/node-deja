/*!
* deja
* Copyright(c) 2011 Mike Cantelon
* MIT Licensed
*/

var path = require('path')
  , fs = require('fs')
  , spawn = require('child_process').spawn

exports.getHomeEnvVarOrDie = function() {

  var home = process.env.HOME

  if (home === undefined) {
    console.log('Error: HOME environmental variable not defined.')
    process.exit(1)
  }

  return home
}

exports.whenDirectoryExists = function(directory, callback) {

  // attempt to make directory if it doesn't already exist
  try {
    fs.mkdirSync(directory, 0700)
  } catch(e) {}

  // if directory exists, run callback or die
  path.exists(directory, function(exists) {

    if (exists) {
      callback()
    }
    else {
      console.log('Error: Could not create $HOME/.deja.')
    }
  })
}

exports.trim = function(text) {

  return text.replace(/^\s*/, '').replace(/\s*$/, '')
}

exports.traverseDir = function(dir, callback) {

  var children = fs.readdirSync(dir)

  for(var index in children) {
    callback(children[index])
  }
}

exports.findUnusedBasename = function(dejaHome, repoUrl, callback, counter) {

  counter = (counter == undefined) ? 0 : counter

  // strip ".git" and pad with counter if the basename's already been used
  var basename = path.basename(repoUrl, '.git')
  basename += (counter > 0) ? '_' + counter : ''

  path.exists(dejaHome + '/' + basename, function(exists) {

    if (exists) {
      // recurse, increasing counter, if basename has already been used
      exports.findUnusedBasename(dejaHome, repoUrl, callback, counter + 1)
    }
    else {
      // provide callback with unused basename
      callback(basename)
    }
  })
}

exports.expandRepoUrl = function(config, repoUrl) {

  // default to Github if protocal not specified
  if (repoUrl.indexOf(':') == -1) {

    // if "username/repo" format not used, get from config
    if (repoUrl.indexOf('/') == -1) {

      if (config.github && config.github.user) {

        repoUrl = 'git@github.com:' + config.github.user + '/' + repoUrl
      }
      else {

        console.log('Error: Github repo name only specified, but no github user defined in $HOME/.gitconfig.')
        console.log('Set one with "git config --global github.user YOUR_USERNAME".')
        process.exit(1)
      }
    }
    else {

      repoUrl = 'git://github.com/' + repoUrl
    }
  }

  return repoUrl
}

exports.clone = function(repoUrl, pathToRepo, successCallback) {

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
            successCallback()
          })
        }
        else {

          successCallback()
        }
      })
    }
  })
}

function formatEntryAndInfo(entry, attributes) {

  var entry_info = ''
  entry_info += (attributes.length) ? ' [' : ''
  entry_info += attributes.join(', ')
  entry_info += (attributes.length) ? ']' : ''
  return entry + entry_info
}

exports.outputEntryAndInfo = function(entry, pathToRepo, pathToEntry) {

  path.exists(pathToEntry, function(exists) {

    var attributes = []

    // if there's a corresponding entry in the home dir, let the user
    // know if it's unlinked or conflicts
    if (exists) {
      fs.lstat(pathToEntry, function(err, stats) {

        // if the home entry links back, display info
        if (stats.isSymbolicLink()) {

          // check if linking to a directory
          var repoEntryStats = fs.statSync(pathToRepo + '/' + entry)

          if (repoEntryStats.isDirectory()) {
            attributes.push('dir')
          }

          // get path link leads to
          var destPath = fs.readlinkSync(pathToEntry)

          if ((pathToRepo + '/' + entry) != destPath) {
            attributes.push('unlinked')
          }
        }
        else {
          // indicate the entry is a conflicting directory
          if (stats.isDirectory()) {
            attributes.push('dir')
          }
          attributes.push('conflicts')
        }

        console.log(formatEntryAndInfo(entry, attributes))
      })
    }
    else {
    // no corresponding entry in home dir, indicate it's unlinked
      fs.stat(pathToRepo + '/' + entry, function(err, stats) {

        if (stats.isDirectory()) {
          attributes.push('dir')
        }
        attributes.push('unlinked')

        console.log(formatEntryAndInfo(entry, attributes))
      })
    }
  })
}
 
exports.createSymlinkIfPathExists = function(symlinkPath, filePath) {

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

exports.deleteSymlinksToRepo = function(home, pathToRepo) {

  exports.traverseDir(pathToRepo, function(entry) {

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

exports.parseOutRepoAndSubdir = function(repo) {

  var pathData
    , subDir = ''

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

exports.spawnThenReport = function(params) {

  var env = (params.env) ? params.env : process.env

  var edit = spawn(params.command, params.arguments, {
    cwd: params.cwd,
    env: env,
    customFds: [
      process.stdin,
      process.stdout,
      process.stderr
    ]
  })

  edit.on('exit', function(code) {

    if (params.successMessage || params.errorMessage) {
      console.log(
        (code == 0)
          ? params.successMessage
          : params.errorMessage
      )
    }
  })
}

exports.checkIfFileShouldBeIgnored = function(file, ignoreList) {

  var ignoreItem

  for(var index in ignoreList) {
    ignoreItem = new RegExp(ignoreList[index])
    if (file.match(ignoreItem)) {
      return true
    }
  }

  return false
}

exports.getIgnoreList = function(home, repo, callback) {

  var ignoreFilename = '.dejaignore'
    , pathToGlobalIgnore = home + '/' + ignoreFilename
    , pathToRepoIgnore = home + '/.deja/' + repo + '/' + ignoreFilename + '_local'
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
    line = helpers.trim(line)

    // change file pattern to regex
    line = '^' + line.replace(/\*/g, '(.*)') + '$'

    // if pattern doesn't exist in ignore list, add it
    if (line != '' && ignoreList.indexOf(line) == -1) {
      ignoreList.push(line)
    }
  }

  return ignoreList
}
