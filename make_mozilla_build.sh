#!/bin/bash
cd $(dirname $0)
echo "Current dir: $(pwd)"

read -p "Appuyer sur enter pour continuer ..."

rm -rf tmp
mkdir tmp

cp -rt tmp data locale icon.png index.js LICENSE package.json README.md

echo "cd tmp..."
cd tmp

read -p "Appuyer sur enter pour continuer ..."

echo "Suppression des console.* ..."
sed -re 's/console\.(warn|info|dir|group|groupEnd|log|error|exception|time|timeEnd|jsm).*/ /g' \
		-e '/^\s*$/d' \
		index.js > index_new.js

sed -n '1h;1!H;${;g;s/ else {[\s\t\n\p\r]*}//g;p;}' index.js > index_new.js

mv index_new.js index.js

sed -re 's/console\.(warn|info|dir|group|groupEnd|log|error|exception|time|timeEnd|jsm).*/ /g' \
		-e '/^\s*$/d' \
		data/panel_contentScriptFile.js > data/panel_contentScriptFile_new.js
mv data/panel_contentScriptFile_new.js data/panel_contentScriptFile.js

sed -n '1h;1!H;${;g;s/ else {[\s\t\n\p\r]*}//g;p;}' data/panel_contentScriptFile.js > data/panel_contentScriptFile_new.js

mv data/panel_contentScriptFile_new.js data/panel_contentScriptFile.js

echo "Remplacement des éléments de package.json..."
sed		-e 's/\"id\"\: \"live_notifier\@zatsunenomokou\.eu\"/\"id\"\: \"dailymotionsstream\@zatsunenomokou\.eu\"/g' \
		-e 's/\"name\"\: \"livenotifier\"/\"name\"\: \"dailymotionsstream\"/g' \
		-e 's/\"title\"\: \"Live notifier (Dev)\"/\"title\"\: \"Live notifier\"/g' \
		-e 's/\"updateLink\"\: \".*\",//g' \
		-e 's/\"updateURL\"\: \".*\",//gi' \
		-e '/^\s*$/d' \
		package.json > package_new.json
mv package_new.json package.json

echo "Ready to build xpi"
read -p "Appuyer sur enter pour continuer ..."

jpm xpi

mv *.xpi ..
cd ..
rm -rf tmp

read -p "Appuyer sur enter pour continuer ..."
