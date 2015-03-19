#!/bin/sh

npm install

cd ../server
for file in $(ls); do
    echo "$file"
    name="${file%.*}"
    echo "$name"
    ../doc/node_modules/.bin/jsdoc $file -d ../doc/jsdoc/server/$name
    node ../doc/replace.js $name
done

cd ../client/js
for file in $(ls); do
    echo "$file"
    name="${file%.*}"
    echo "$name"
    ../../doc/node_modules/.bin/jsdoc $file -d ../../doc/jsdoc/client/js/$name
    node ../../doc/replace.js $name
done

