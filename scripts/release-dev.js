const
	pjson = require('../package.json'),
	fs = require("fs-extra"),
	path = require("path"),
	pwd = path.join(__dirname, ".."),

	{ exec:_exec, execSync:_execSync } = require('child_process'),
	// exec = require('util').promisify(_exec),

	{fsReadFile} = require("./file-operations"),
	echo = console.log,
	{error, warning, info, success} = require("./custom-console")
;

/**
 *
 * @param {String} command
 * @param {Boolean} outputInConsole
 * @return {Buffer | String} Stdout from the command
 */
function execSync(command, outputInConsole=false) {
	let options = {
		"cwd": pwd,
		"timeout": 20 * 1000 // 10s
	};

	if(outputInConsole===true){
		options.stdio = [process.stdin, process.stdout, process.stderr];
	}

	return _execSync(command, options);
}

/**
 *
 * @param {String} msg
 */
function throwException(msg) {
	console.trace();
	error(msg);
	process.exit(1);
}

/**
 *
 * @param {Promise} promise
 * @return {Promise<*>}
 */
function errorHandler(promise) {
	promise.catch(err=>{
		throwException(err);
	});
	return promise;
}


async function init() {
	if(await fs.pathExists(path.join(pwd, `./live_notifier_dev_-${pjson.version}.zip`))){
		throwException(`Zip package already exist for version ${pjson.version}!`);
	}

	const webExtManifestJsonPath = path.join(pwd, "./webextension/manifest.json"),
		data = await fsReadFile(webExtManifestJsonPath),

		versionReg = /([ \t]"version": *")(\d+\.\d+\.\d+)(",?)/gi
	;

	let replacedCount = 0;
	data.replace(versionReg, (match, p1, p2, p3)=>{
		replacedCount++;
		return p1 + pjson.version + p3;
	});
	if(replacedCount!==1){
		throwException("Error updating version");
	}

	errorHandler(fs.writeFile(webExtManifestJsonPath, data, {
		encoding: 'utf-8'
	}));


	const tmpPath = path.join(pwd, "./tmp");
	if(await fs.pathExists(tmpPath)){
		warning("Temporary folder already exist, deleting...");
		await errorHandler(fs.remove(tmpPath));
	}
	await errorHandler(fs.mkdir(tmpPath));

	echo("Copying into tmp folder");
	try{
		execSync("cp -rt tmp ./webextension/data ./webextension/_locales ./webextension/icon*.png ./webextension/init.js ./webextension/LICENSE ./webextension/manifest.json", true);
	} catch (e){
		error(e);
	}

	try{
		execSync("web-ext build --artifacts-dir ./ --source-dir ./tmp", true);
	} catch (e){
		error(e);
	}

	await errorHandler(fs.remove(tmpPath));
}

init();
