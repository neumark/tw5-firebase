#!/usr/bin/env bash
if (( $# != 1 ))
then
  echo "Usage: $0 backup_dir"
  exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
EXPORTLINK="$DIR/../editions/fsloader/export"
EXPORTDIR="$( cd "$1" >/dev/null 2>&1 && pwd )"

cleanup_symlink() {
  # unlink symlink if it exists
  if [ -e "$EXPORTLINK" ]; then
      unlink "$EXPORTLINK"
  fi
}

cleanup_symlink
ln -s "$EXPORTDIR" "$EXPORTLINK"
TMP="$(mktemp).json"
"$DIR/export.sh" > "$TMP"
"$DIR/tiddlers-to-fs.sh" "$TMP"
rm "$TMP"
cleanup_symlink

