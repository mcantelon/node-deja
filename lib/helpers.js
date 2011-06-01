/*!
* deja
* Copyright(c) 2011 Mike Cantelon
* MIT Licensed
*/

var path = require('path'),
  fs = require('fs'),
  spawn = require('child_process').spawn

exports.trim = function(text) {

  return text.replace(/^\s*/, '').replace(/\s*$/, '')
}

exports.traverseDir = function(dir, callback) {

  children = fs.readdirSync(dir)

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
