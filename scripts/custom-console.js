const chalk = require('chalk');

/**
 *
 * @param {String} msg
 */
function error(msg){
	return console.log(chalk.bold.red(msg));
}

/**
 *
 * @param {String} msg
 */
function warning(msg){
	return console.log(chalk.keyword('orange')(msg));
}

/**
 *
 * @param {String} msg
 */
function info(msg) {
	return console.log(chalk.blueBright(msg));
}

/**
 *
 * @param {String} msg
 */
function success(msg){
	return console.log(chalk.green(msg));
}


module.exports = {
	"error": error,
	"warning": warning,
	"info": info,
	"success": success
};
