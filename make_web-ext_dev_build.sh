#!/bin/bash
cd $(dirname $0)
echo "Current dir: $(pwd)"

read -p "Appuyer sur enter pour continuer ..."

rm -rf tmp
mkdir tmp

echo "Copying into tmp folder"
cp -rt tmp ./webextension/data ./webextension/_locales ./webextension/icon*.png ./webextension/index.js ./webextension/LICENSE ./webextension/manifest.json

read -p "Appuyer sur enter pour continuer ..."


web-ext build --artifacts-dir ./ --source-dir ./tmp

rm -rf tmp

read -p "Appuyer sur enter pour continuer ..."
