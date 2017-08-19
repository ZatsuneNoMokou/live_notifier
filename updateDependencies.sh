#!/usr/bin/env bash
npm update jquery perfect-scrollbar mustache webextension-polyfill i18next i18next-xhr-backend
npm update lodash-cli -g

cssLib='./webextension/data/css/lib'
jsLib='./webextension/data/js/lib'


echo Copying jQuery...
cp ./node_modules/jquery/dist/jquery.slim.min.js $jsLib
cp ./node_modules/jquery/dist/jquery.slim.min.map $jsLib

echo Copying mustache...
cp ./node_modules/mustache/mustache.min.js $jsLib

echo Copying perfect-scrollbar...
cp ./node_modules/perfect-scrollbar/dist/css/perfect-scrollbar.min.css $cssLib
cp ./node_modules/perfect-scrollbar/dist/js/perfect-scrollbar.jquery.min.js $jsLib

echo Copying webextension-polyfill...
cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js $jsLib
cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map $jsLib

echo Copying/Building Lodash Debounce - Custom Build # https://lodash.com/custom-builds
lodash exports=global include=debounce --production --source-map
mv lodash.custom.min.js $jsLib
mv lodash.custom.min.map $jsLib

echo Copying i18next...
cp ./node_modules/i18next/i18next.min.js $jsLib

echo Copying i18next-xhr-backend...
cp ./node_modules/i18next-xhr-backend/i18nextXHRBackend.min.js $jsLib