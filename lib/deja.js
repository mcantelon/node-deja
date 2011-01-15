#!/usr/bin/env node
var sys = require('sys'),
  path = require('path'),
  fs = require('fs'),
  spawn = require('child_process').spawn,
  wrench = require('wrench'),
  argv = require('optimist')
    .default('c', './cable')
    .argv

exports.usage = function() {

  return "deja == a simple tool for managing git versioning of dotfiles/scripts.\n\
\n\
Usage: \n\
deja clone <GIT REPO>\n\
deja ls\n\
deja pull <REPO>\n\
deja rm <REPO>"
}

exports.ls = function(dejaHome) {

  children = fs.readdirSync(dejaHome)

  for(var index in children) {

    // need to check legitimacy of archive
    var entry = children[index]
    console.log(entry)
  }
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

exports.rmRepo = function(dejaHome, repo) {

  var destination = dejaHome + '/' + repo

  path.exists(destination, function(exists) {

    if (exists) {

      wrench.rmdirSyncRecursive(destination)
      console.log('Repo removed.')
    }
    else {

      console.log('Error: Not a valid repo.')
    }
  })
}

exports.cloneRepo = function(home, dejaHome, repo) {

  var basename = path.basename(repo)

  var destination = dejaHome + '/' + basename

  path.exists(destination, function(exists) {

    if (exists) {

      console.log('Error: Repo already exists.')
      process.exit(1)
    }
    else {

      var clone = spawn('git', ['clone', repo, destination])

      clone.on('exit', function(code) {

        // TODO: add error handling if exit code is bad
        // cycle through cloned repo making symlinks to home
        children = fs.readdirSync(destination)

        for(var index in children) {

          var file = children[index]
          if (file != '.git') {

            var symlinkPath = destination + '/' + file
            var filepath = home + '/' + file

            createSymlink(symlinkPath, filepath)
          }
        }
      })
    }
  })
}

exports.diffRepo = function (home, dejaHome, param) {

  var destination = dejaHome + '/' + param

  path.exists(destination, function(exists) {

    if (exists) {

      children = fs.readdirSync(destination)

      for(var index in children) {

        var file = children[index]

        if (file != '.git') {
          diffIfNotSymbolicLink(home, destination, file)
        }
      }
    }
    else {

      console.log('Error: Not a valid repo.')
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

function createSymlink(symlinkPath, filepath) {

  path.exists(filepath, function(exists) {

    if (!exists) {

      console.log(symlinkPath + ' -> ' + filepath)
      spawn('ln', ['-s', symlinkPath, filepath])
    }
    else {

      console.log('Skipped ' + filepath + ': already exists.')
    }
  })
}
