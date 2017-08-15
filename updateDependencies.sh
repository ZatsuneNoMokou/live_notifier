#!/usr/bin/env bash
npm install jquery perfect-scrollbar mustache webextension-polyfill underscore i18next i18next-xhr-backend

cssLib='./webextension/data/css/lib'
jsLib='./webextension/data/js/lib'


echo Copying jQuery...
cp ./node_modules/jquery/dist/jquery.min.js $jsLib
cp ./node_modules/jquery/dist/jquery.min.map $jsLib

echo Copying mustache...
cp ./node_modules/mustache/mustache.min.js $jsLib

echo Copying perfect-scrollbar...
cp ./node_modules/perfect-scrollbar/dist/css/perfect-scrollbar.min.css $cssLib
cp ./node_modules/perfect-scrollbar/dist/js/perfect-scrollbar.jquery.min.js $jsLib

echo Copying webextension-polyfill...
cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js $jsLib
cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map $jsLib

echo Copying underscore
cp ./node_modules/underscore/underscore-min.js $jsLib
cp ./node_modules/underscore/underscore-min.map $jsLib

echo Copying i18next...
cp ./node_modules/i18next/i18next.min.js $jsLib/../locales

echo Copying i18next-xhr-backend...
cp ./node_modules/i18next-xhr-backend/i18nextXHRBackend.min.js $jsLib/../locales