#!/bin/bash
SUDO=''
if [ "$EUID" -ne 0 ]; then
  SUDO='sudo'
fi
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
$SUDO ln -sf "$SCRIPT_DIR/main.py" /usr/local/bin/archtype
echo "archtype installed successfully!"
echo "You can now run the game by typing: archtype"