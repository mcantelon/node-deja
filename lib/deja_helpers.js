/*!
* deja
* Copyright(c) 2011 Mike Cantelon
* MIT Licensed
*/

var path = require('path'),
  fs = require('fs'),
  spawn = require('child_process').spawn,
  wrench = require('wrench')

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
      findUnusedBasename(dejaHome, repoUrl, callback, counter + 1)
    }
    else {
      // provide callback with unused basename
      callback(basename)
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
