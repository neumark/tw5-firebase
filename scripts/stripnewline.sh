#!/usr/bin/env bash

# strips newline at end of file, required for .tid files to not include faulty \n
file=$1
length=$(wc -c <$file)
if [ "$length" -ne 0 ] && [ -z "$(tail -c -1 <$file)" ]; then
  echo "The file ends with a newline or null"
  dd if=/dev/null of=$file obs="$((length-1))" seek=1
fi
