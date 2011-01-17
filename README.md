# deja

deja is a node.js-driven CLI utility for managing the git versioning of home
directory sundries, such as dotfiles and personal scripts.

If you have a Git repository containing your dotfiles, for example, you can
clone this repo, and add symlinks in your home directory to the items in it,
using a deja command like:

    deja clone git@github.com:mcantelon/dotfiles.git

The repo would then be stored at "~/.deja/dotfiles". Git repo URLs default to
Github, so you could also clone using the following:

    deja clone mcantelon/dotfiles

To update this repo you'd enter:

    deja pull dotfiles

To remove this repo (and any home directory symlinks) you'd enter:

    deja rm dotfiles

To see the differences between this repo and what currently exists in your
home directory you'd enter:

    deja diff dotfiles

To see all repos you've cloned enter:

    deja ls

Inspired by Homesick: https://github.com/technicalpickles/homesick

## Installation

    npm install deja
