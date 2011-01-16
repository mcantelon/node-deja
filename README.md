# deja

deja is a node.js-driven CLI utility for managing the git versioning of home
directory sundries, such as dotfiles and personal scripts.

If you have a Git repository containing your dotfiles, for example, you can
clone this repo, and add symlinks in your home directory to the items in it,
using a deja command like:

    deja clone git@github.com:mcantelon/dotfiles.git

To update this repo you'd enter:

    deja pull dotfiles.git

To remove this repo you'd enter:

    deja rm dotfiles.git

To see all repos you've cloned, enter:

    deja ls

To see what the difference is between a repo and what currently exists in your
home directory:

    deja diff dotfiles.git

Inspired by Homesick: https://github.com/technicalpickles/homesick
