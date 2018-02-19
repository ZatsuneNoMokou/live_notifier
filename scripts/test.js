const
	WARNING_CHAR="⚠",
	SUCCESS_CHAR="✅",
	{error, warning, info} = require('./custom-console'),
	stylelint = require('stylelint'),

	path = require('path'),
	pwd = path.join(__dirname, "..")
;

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

	info(`\n${SUCCESS_CHAR} No errors`);
	process.exit(0);
})();
