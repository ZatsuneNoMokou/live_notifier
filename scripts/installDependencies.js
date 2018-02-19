const
	echo = console.log,

	fs = require('fs-extra'),
	path = require('path'),
	pwd = path.join(__dirname, ".."),

	{ exec:_exec } = require('child_process'),

	cssLib = path.join(pwd, './webextension/data/css/lib/'),
	jsLib = path.join(pwd, './webextension/data/js/lib/')
;

const {cp} = require("./file-operations");
const {error, warning, info, success} = require("./custom-console");


/**
 *
 * @param {Promise} promise
 * @return {Promise<*>}
 */
async function exceptionHandler(promise) {
	let result;

	try{
		result = await promise;
	} catch(err){
		console.trace();
		error(err);
		process.exit(1);
	}

	return result;
}


/**
 *
 * @param {String} cmd
 * @return {Promise<String>}
 */
function exec(cmd) {
	return new Promise((resolve, reject)=>{
		_exec(cmd, (err, stdout, stderr) => {
			if(err===null) {
				reject(err);
			} else {
				resolve(stdout);
			}
		});
	})
}




async function init() {
	const exist_cssLib = await fs.pathExists(cssLib),
		exist_jsLib = await fs.pathExists(jsLib)
	;

	const _cp = function (src, dest) {
		return exceptionHandler(cp(path.join(pwd, src), dest));
	};

	if(!exist_cssLib){
		error("CSS lib folder not found!");
		process.exit(1);
	} else if(!exist_jsLib){
		error("JS lib folder not found!");
		process.exit(1);
	} else {
		echo("Copying mustache...");
		await _cp("./node_modules/mustache/mustache.js", jsLib);

		echo("Copying perfect-scrollbar...");
		await _cp("./node_modules/perfect-scrollbar/css/perfect-scrollbar.css", cssLib);
		await _cp("./node_modules/perfect-scrollbar/dist/perfect-scrollbar.js", jsLib);

		echo("Copying webextension-polyfill...");
		await _cp("./node_modules/webextension-polyfill/dist/browser-polyfill.js", jsLib);
		await _cp("./node_modules/webextension-polyfill/dist/browser-polyfill.js.map", jsLib);

		echo("Copying/Building Lodash Debounce - Custom Build..."); // https://lodash.com/custom-builds
		let stdout = null;
		try {
			stdout = await exec(`cd ${jsLib} && lodash exports=global include=debounce --development --source-map`);
		} catch(err){
			if(err){
				error(err);
				process.exit(1);
			}
		}

		if(stdout!==null){
			info(stdout);
		}

		echo("Copying i18next...");
		await _cp("./node_modules/i18next/i18next.js", jsLib);

		echo("Copying i18next-xhr-backend...");
		await _cp("./node_modules/i18next-xhr-backend/i18nextXHRBackend.js", jsLib);

		info("No automatic update for Opentip, manually modified files...");
		/*
		echo("Downloading Tooltip...");
		curl -L -# -o master.zip https://github.com/matthias-schuetz/Tooltip/archive/master.zip
		echo("Copying Tooltip...");
		mkdir tmp && unzip -qq master.zip -d tmp && rm master.zip
		cp ./tmp/Tooltip-master/css/tooltip.css $cssLib
		cp ./tmp/Tooltip-master/js/Tooltip.js $jsLib
		rm -R tmp
		*/

		echo("Copying dom-delegate...");
		await _cp("./node_modules/dom-delegate/build/dom-delegate.js", jsLib);

		success("\n✅ Done");
		process.exit(0);
	}
}
init();
