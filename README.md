# deja

deja is a node.js-driven CLI utility for managing the git versioning of home
directory sundries, such as dotfiles and personal scripts. deja was inspired by
the Ruby application [homesick](https://github.com/technicalpickles/homesick).

## The Basics

Putting your dotfiles and personal scripts into a Git repository offers a lot
of advantages, but there's one obstacle: Git won't let you clone directly into
your home directory. One can, however, clone a repo to another directory then
use symbolic links to point from one's home directory to the cloned files. deja
makes this easy.

If you have a Git repository containing your dotfiles, for example, you can
clone this repo, automatically adding symlinks in your home directory to the
items in it, using a deja command like:

    deja clone git@github.com:mcantelon/dotfiles.git

The repo would then be stored at `~/.deja/dotfiles`.

Git repo URLs default to Github and the `.git` at the end of a repo URL can be
left off, so you could also do a quick read-only clone by entering the
following:

    deja clone mcantelon/dotfiles

To update this repo you'd enter:

    deja pull dotfiles

To remove this repo (and any home directory symlinks) you'd enter:

    deja rm dotfiles

To see all repos you've cloned you'd enter:

    deja ls

## Other Stuff

To see the differences between a repo and what currently exists in your
home directory you'd enter something like this:

    deja diff dotfiles

To remove links to your repo, for whatever reason, you'd enter:

    deja unlink dotfiles

To re-add links to your repo after removing them, you'd enter:

    deja link dotfiles

## Repo Subdirectories

When deja clones, it just adds symlinks to the first level of files and
directories contained in your repo, skipping symlink creation when a file
or directory of the same name already exists in the home directory.

If your repo contains a `bin` directory, but you already have a `bin` directory
in your home directory, deja would skip creation of a symlink to `bin`.

If, however, you wanted to create symlinks in your home directory's `bin`
directory to the contents of your repo's `bin` directory  you could do so by
entering:

    deja link dotfiles/bin

If you did this and changed your mind you could remove the symlinks by entering:

    deja unlink dotfiles/bin

## Installation

The easiest way is via [npm](https://github.com/isaacs/npm):

    npm install deja

## Dependencies

deja requires the [wrench.js](https://github.com/ryanmcgrath/wrench-js) and
[optimist](https://github.com/substack/node-optimist) node.js modules (both
are available via npm as "wrench" and "optimist" respectively).

deja, of course, requires [git](http://git-scm.com/) to be installed.

## Testing

Testing requires the [expresso](ihttps://github.com/visionmedia/expresso)
module (available via rpm as "expresso").

Run the tests by entering:

    expresso

