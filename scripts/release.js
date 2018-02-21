const
	pjson = require('../package.json'),
	fs = require("fs-extra"),
	path = require("path"),
	pwd = path.join(__dirname, ".."),

	{ exec, execSync } = require('./custom-child-process')(pwd),

	{fsReadFile} = require("./file-operations"),
	echo = console.log,
	{error, warning, info, success} = require("./custom-console"),

	through2 = require('through2'),
	{getFilesRecursively, modifyFiles} = require('./modify-file'),
	stripDebug = require('strip-debug'), //TODO /!\ Using my rocambole fork hoping update https://github.com/millermedeiros/rocambole/issues/32

	yargs = require('yargs')
		.usage('Usage: $0 [options]')

		.option('d', {
			"alias": "dev",
			"description": 'Do "dev" release [num].[num].[num]',
			"type": "string",
			"coerce": arg=>{
				const versionReg = /\d+\.\d+\.\d+/;
				if(arg==='' || versionReg.test(arg)===true){
					return arg
				} else {
					throw "Invalid version pattern";
				}
			}
		})
		.fail(function (msg, err, yargs) {
			if(msg==="yargs error"){
				console.error(yargs.help());
			}

			/*if(err){// preserve stack
				throw err;
			}*/

			process.exit(1)
		})

		.help('h')
		.alias('h', 'help')
		.argv
;

/**
 *
 * @param {String} msg
 */
function throwException(msg) {
	console.trace();
	error(msg);
	process.exit(1);
}

function _setTimeout(millisecond) {
	return new Promise(resolve=>{
		setTimeout(resolve, millisecond);
	})
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

	/*const webExtManifestJsonPath = path.join(pwd, "./webextension/manifest.json"),
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
	}));*/


	const tmpPath = path.join(pwd, "./tmp");
	if(await fs.pathExists(tmpPath)){
		warning("Temporary folder already exist, deleting...");
		await errorHandler(fs.remove(tmpPath));
	}
	await errorHandler(fs.mkdir(tmpPath));

	echo("Copying into tmp folder");
	try{
		fs.copySync(path.join(pwd, "./webextension"), tmpPath);
		//execSync("cp -rt tmp ./webextension/data ./webextension/_locales ./webextension/icon*.png ./webextension/init.js ./webextension/LICENSE ./webextension/manifest.json", true);
	} catch (e){
		error(e);
	}

	if(!yargs.hasOwnProperty("dev")){
		echo("Ready to clean files!");

		let excludeDirString = "data/js/lib";
		if(process.platform==="win32"){
			excludeDirString = "data\\js\\lib";
		}

		const excludeDirAndJsFilter = through2.obj(function (item, enc, next) {
			if(item.path.indexOf(excludeDirString)===-1 && item.stats.isFile() && path.extname(item.path) === `.js`){
				this.push(item)
			}
			next()
		});

		await modifyFiles(tmpPath, function (data, filePath) {
			try {
				data = stripDebug(data).toString();
			} catch (err){
				console.trace();
				info(filePath);
				error(err);
				process.exit(1);
			}
			return data;
		}, excludeDirAndJsFilter)
			.catch(err=>{
				console.trace();
				info(filePath);
				error(err);
				process.exit(1);
			})
		;
	}

	try{
		execSync("web-ext build --artifacts-dir ./ --source-dir ./tmp", true);
	} catch (e){
		error(e);
	}

	await errorHandler(fs.remove(tmpPath));
}

init();
