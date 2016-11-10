#!/bin/bash
cd $(dirname $0)
echo "Current dir: $(pwd)"

function cleanConsole { # cleanConsole file
	file=$1
	filebasename=`basename $1`
	
	if [ -f "$file" ]
	then
		echo "Suppression des console.* dans $filebasename..."
		sed -re 's/console\.(warn|info|dir|group|groupEnd|log|error|exception|time|timeEnd|jsm).*//g' -e '/^\s*$/d' $file > "$filebasename_tmpfile.js"
		mv "$filebasename_tmpfile.js" $file
		
		sed -n '1h;1!H;${;g;s/ else {[\s\t\n\p\r]*}//g;p;}'  $file > "$filebasename_tmpfile.js"
		mv "$filebasename_tmpfile.js" $file
		
		echo ""
	else
		echo "$file not found."
	fi
}

function cleanFiles { # listFiles directory fileextension
	for item in "$1"/*;do
		if [ -d "$item" ];then
			if [[ $item == *"data/js/lib"* ]]; then
				echo "Ignoring $item"
				echo ""
			else
				echo "dir: $item"
				cleanFiles "$item" "$2"
			fi
		elif [[ -f "$item" && "${item##*.}" == "$2" ]]; then
			echo "file: $item"
			cleanConsole $item
		fi
	done
}

read -p "Appuyer sur enter pour continuer ..."


rm -rf tmp
mkdir tmp

echo ""
echo "Copying into tmp folder"
cp -rt tmp ./webextension/data ./webextension/_locales ./webextension/icon*.png ./webextension/index.js ./webextension/LICENSE ./webextension/manifest.json

echo ""
echo "Read to clean files!"
read -p "Appuyer sur enter pour continuer ..."


cleanFiles "${PWD}/tmp" js

echo ""
echo "Remplacement des éléments de manifest.json..."

cd tmp
sed		-e 's/\"id\"\: \"livenotifier_dev\@zatsunenomokou\.eu\"/\"id\"\: \"livenotifier\@zatsunenomokou\.eu\"/g' \
		-e 's/\"name\"\: \"Live Notifier (Dev)\"/\"name\"\: \"Live Notifier\"/g' \
		-e 's/\"short_name\"\: \"LiveNotifierDev\"/\"short_name\"\: \"LiveNotifier\"/g' \
		-e 's/\"update_url\"\: \".*\",//gi' \
		-e '/^\s*$/d' \
		manifest.json > manifest_new.json
mv manifest_new.json manifest.json
cd ..

echo ""
echo "Ready to build!"
read -p "Appuyer sur enter pour continuer ..."
echo ""

web-ext build --artifacts-dir ./ --source-dir ./tmp

rm -rf tmp

read -p "Appuyer sur enter pour continuer ..."
