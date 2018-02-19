const
	{ exec:_exec, execSync:_execSync } = require('child_process'),
	exec = require('util').promisify(_exec)
;

let pwd = null;

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

module.exports = function (workingDir) {
	pwd = workingDir;
	return {
		"execSync": execSync,
		"exec": exec
	}
};
