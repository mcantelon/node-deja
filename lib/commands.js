/*!
* deja
* Copyright(c) 2011 Mike Cantelon
* MIT Licensed
*/

var path = require('path')
  , fs = require('fs')
  , spawn = require('child_process').spawn
  , wrench = require('wrench')
  , helpers = require('./helpers')

exports.ignore_files = [
  '.git',
  '.gitmodules',
  '.dejaignore_local'
]

exports.usage = function() {

  return fs.readFileSync(__dirname + '/../docs/usage.txt').toString()
}

exports.ls = function(home, dejaHome, repo) {

  var pathToRepo = dejaHome
    , subDir

  pathToRepo += (repo) ? '/' + repo : ''

  if (repo) {
    var repoAndSubDir = helpers.parseOutRepoAndSubdir(repo)
    subDir = repoAndSubDir.subDir
    subDir = (subDir != '')
      ? '/' + subDir
      : ''
  }

  path.exists(pathToRepo, function(exists) {

    if (exists) {
      helpers.traverseDir(pathToRepo, function(entry) {

        if (exports.ignore_files.indexOf(entry) == -1) {

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

  repoUrl = helpers.expandRepoUrl(config, repoUrl)

  var basename = helpers.findUnusedBasename(dejaHome, repoUrl, function(basename) {

    var pathToRepo = dejaHome + '/' + basename

    path.exists(pathToRepo, function(exists) {

      if (exists) {

        console.log('Error: Repo already exists.')
        process.exit(1)
      }
      else {

        console.log('Cloning repository...')

        helpers.clone(repoUrl, pathToRepo, function() {

          // create symlinks to items in first level of repo directory
          exports.linkRepo(home, dejaHome, basename)
        })
      }
    })
  })
}

exports.linkRepo = function(home, dejaHome, repo) {

  var pathToRepo = dejaHome + '/' + repo
    , subDir
    , repoAndSubDir = helpers.parseOutRepoAndSubdir(repo)

  repo   = repoAndSubDir.repo
  subDir = repoAndSubDir.subDir
  subDir += (subDir != '')
    ? '/'
    : ''

  var symlinkRootPath = home + '/' + subDir

  helpers.getIgnoreList(home, repo, function(ignoreList) {

    path.exists(symlinkRootPath, function(exists) {

      if (exists) {

        console.log('Creating symbolic links for "' + repo + '"...')

        // cycle through cloned repo making symlinks to home
        helpers.traverseDir(pathToRepo, function(file) {

          if (exports.ignore_files.indexOf(file) == -1) {

            var filePath     = pathToRepo + '/' + file
            var symlinkPath  = symlinkRootPath + file

            helpers.checkIfFileShouldBeIgnored(file, ignoreList)
              ? console.log('  Ignored ' + file + '.')
              : helpers.createSymlinkIfPathExists(symlinkPath, filePath)
          }
        })
      }
      else {

        console.log('Error: Not a valid repo.')
      }
    })
  })
}

exports.updateRepos = function(home, dejaHome) {

  // cycle through repos
  path.exists(dejaHome, function(exists) {

    if (exists) {
      helpers.traverseDir(dejaHome, function(repo) {

        // pull repo then link files
        exports.pullRepo(dejaHome, repo, function(repo) {
          exports.linkRepo(home, dejaHome, repo)
        })
      })
    }
  })

  // pull repo
  // link repo
}

exports.exploreRepo = function(dejaHome, repo) {

  var repoPathAbsolute = dejaHome + '/' + repo

  path.exists(repoPathAbsolute, function(exists) {

    if (exists) {

      var shellexec = process.env.SHELL

      helpers.spawnThenReport({
        cwd: repoPathAbsolute,
        command: shellexec,
        arguments: []
      })
    }
    else {

      console.log('Error: invalid directory.')
    }
  })
}

exports.editRepoFile = function(dejaHome, repoFilePath) {

  var repoFilePathAbsolute = dejaHome + '/' + repoFilePath
    , repoFilePathAbsoluteDir = path.dirname(repoFilePathAbsolute)

  path.exists(repoFilePathAbsoluteDir, function(exists) {

    if (exists) {

      var editor = (process.env.EDITOR) ? process.env.EDITOR : 'vim'

      helpers.spawnThenReport({
        command: editor,
        arguments: [repoFilePathAbsolute],
        successMessage: 'Edit of "' + repoFilePath + '" complete.',
        errorMessage: 'Error: Could not edit.'
      })
    }
    else {

      console.log('Error: invalid directory.')
    }
  })
}

exports.editCheat = function(dejaHome, cheat) {

  // get relative path from git config, error if not set
  var getCheatPath = spawn('git', ['config', 'deja.cheatpath'])

  var cheatPath = ''

  getCheatPath.stdout.on('data', function(data) {

    cheatPath += data.toString()
  })

  getCheatPath.stdout.on('end', function() {

    cheatPath = cheatPath.trim()

    if (cheatPath == '') {

      console.log('Error: issue the command "git config --global deja.cheatpath <repo name[/path/to/cheats]>" to set the path to your cheats.')
    }
    else {

      var cheatPathAbsolute = dejaHome + '/' + cheatPath

      path.exists(cheatPathAbsolute, function(exists) {

        if (exists) {

          cheatFilePath = cheatPath + '/' + cheat + '.txt'

          exports.editRepoFile(dejaHome, cheatFilePath)
        }
        else {

          console.log('Error: path to cheat files does not exist.')
        }
      })
    }
  })
}

exports.pullRepo = function (dejaHome, repo, callback) {

  var pathToRepo = dejaHome + '/' + repo

  path.exists(pathToRepo, function(exists) {

    if (exists) {

      console.log('Pulling "' + repo + '"...')

      process.chdir(pathToRepo)

      var pull = spawn('git', ['pull'])

      pull.on('exit', function(code) {

        console.log((code == 0)
          ? 'Pull of "' + repo + '" complete.'
          : 'Error: Could not pull.'
        )

        if (callback) {
          callback(repo)
        }
        else {
          process.exit(code)
        }
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

  var pathToRepo = dejaHome + '/' + repo
    , subDir
    , repoAndSubDir = helpers.parseOutRepoAndSubdir(repo)

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

  var pathToRepo = dejaHome + '/' + repo
    , subDir
    , repoAndSubDir = helpers.parseOutRepoAndSubdir(repo)

  repo   = repoAndSubDir.repo
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

