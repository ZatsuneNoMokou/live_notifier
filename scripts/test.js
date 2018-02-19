const
	WARNING_CHAR="⚠",
	SUCCESS_CHAR="✅",
	{error, warning, info, success} = require('./custom-console'),
	stylelint = require('stylelint'),

	{ execSync:_execSync } = require('child_process'),

	path = require('path'),
	pwd = path.join(__dirname, "..")
;

/**
 *
 * @param {String} command
 * @param {Boolean} outputInConsole
 * @return {Buffer | String} Stdout from the command
 */
function execSync(command, outputInConsole=false) {
	let options = {
		"cwd": pwd
	};

	if(outputInConsole===true){
		options.stdio = [process.stdin, process.stdout, process.stderr];
	}

	return _execSync(command, options);
}


(async function () {
	info(`Current dir: ${pwd}\n`);

	warning(`${WARNING_CHAR} Test only cover CSS with Stylelint for now ${WARNING_CHAR}\n`);

	info(`Testing CSS...`);

	let result = null,
		result_error = null
	;

	try{
		result = await stylelint.lint({
			"configBasedir": pwd,
			"defaultSeverity": "warning",
			"files": "webextension/**/*.css",
			"formatter": "verbose"
		})
			.catch(error)
		;
	} catch (err){
		result_error = err;
	}

	if(result_error){
		error("Error thrown :");
		error(result_error);
		process.exit(1);
		return;
	} else if(result.errored){
		error(result.output);
		process.exit(1);
		return;
	}

	result = null;
	result_error = null;


	info(`Testing web-ext lint...`);

	try {
		result = execSync("web-ext lint --self-hosted --source-dir ./webextension", true);
	} catch (err) {
		result_error = err;
	}

	if(result_error){
		error("Error thrown :");
		error(result_error);
		process.exit(1);
		return;
	}

	result = null;
	result_error = null;

	success(`\n${SUCCESS_CHAR} No errors`);
	process.exit(0);
})();
