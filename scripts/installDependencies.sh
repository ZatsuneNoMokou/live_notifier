#!/usr/bin/env bash

cd $(dirname $0)/..
echo "Current dir: $(pwd)"

cssLib='./webextension/data/css/lib'
jsLib='./webextension/data/js/lib'

echo Copying mustache...
cp ./node_modules/mustache/mustache.js $jsLib

echo Copying perfect-scrollbar...
cp ./node_modules/perfect-scrollbar/css/perfect-scrollbar.css $cssLib
cp ./node_modules/perfect-scrollbar/dist/perfect-scrollbar.js $jsLib

echo Copying webextension-polyfill...
cp ./node_modules/webextension-polyfill/dist/browser-polyfill.js $jsLib
cp ./node_modules/webextension-polyfill/dist/browser-polyfill.js.map $jsLib

echo Copying/Building Lodash Debounce - Custom Build # https://lodash.com/custom-builds
lodash exports=global include=debounce --development --source-map
mv lodash.custom.js $jsLib
mv lodash.custom.map $jsLib

echo Copying i18next...
cp ./node_modules/i18next/i18next.js $jsLib

echo Copying i18next-xhr-backend...
cp ./node_modules/i18next-xhr-backend/i18nextXHRBackend.js $jsLib

echo No automatic update for Opentip, manually modified files...

echo Downloading/Copying dom-delegate...
curl -L -# -o $jsLib/dom-delegate.js http://wzrd.in/standalone/dom-delegate@latest