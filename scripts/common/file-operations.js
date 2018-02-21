const
	_fs = require('fs-extra'),
	_path = require('path')
;

function fsReadFile(filePath) {
	return new Promise((resolve, reject)=>{
		_fs.readFile(filePath, {encoding: 'utf-8'})
			.then(resolve)
			.catch(reject)
		;
	})
}

/**
 * Copy `src` to `dest`, in Promise way.
 *
 * @param {String} src
 * @param {String} dest
 * @return {Promise<>}
 */
function cp(src, dest) {
	return new Promise((resolve, reject)=>{
		if(_fs.lstatSync(dest).isDirectory()){
			dest = _path.resolve(dest, "./" + _path.basename(src));
		}

		_fs.copyFile(src, dest)
			.then(resolve)
			.catch(reject)
		;
	})
}





module.exports = {
	"fsReadFile": fsReadFile,
	"cp": cp
};
