const
	_fs = require('fs-extra'),
	_path = require('path'),
	klaw = require('klaw')
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





/**
 *
 * @param {String} filePath
 * @param {Function} fn
 * @param {String="utf8"} fileType
 * @return {Promise<void>}
 */
async function modifyFile(filePath, fn, fileType="utf8") {
	let data;
	if(fileType==="json"){
		data = await _fs.readJson(filePath);
	} else {
		data = await _fs.readFile(filePath, fileType);
	}

	data = fn.call(this, data, filePath);

	if(data===undefined){
		await _fs.remove(filePath);
	} else {
		if(fileType==="json"){
			await _fs.writeJson(filePath, data, {
				"spaces": "\t"
			});
		} else {
			await _fs.writeFile(filePath, data, fileType);
		}
	}
}





/**
 *
 * @param {String} path
 * @param excludePipe
 * @return {Promise<{path: String, stat: Stats}>}
 */
function getFilesRecursively(path, excludePipe=null) {
	return new Promise(resolve=>{
		const items = [];

		const onData = item=>{
			items.push(item);
		};
		const onEnd = ()=>{
			resolve(items)
		};

		if(excludePipe!==null){
			klaw(path)
				.pipe(excludePipe)
				.on('data', onData)
				.on('end', onEnd)
			;
		} else {
			klaw(path)
				.on('data', onData)
				.on('end', onEnd)
			;
		}
	})
}






/**
 *
 * @param {String} path
 * @param {Function} fn
 * @param excludePipe
 * @return {Promise<void>}
 */
async function modifyFiles(path, fn, excludePipe=null) {
	const
		queue = [],
		items = await getFilesRecursively(path, excludePipe)
	;

	items.forEach(data=>{
		queue.push(modifyFile(data.path, fn));
	});

	return await Promise.all(queue);
}





module.exports = {
	"fsReadFile": fsReadFile,
	"cp": cp,

	"modifyFile": modifyFile,
	"getFilesRecursively": getFilesRecursively,
	"modifyFiles": modifyFiles
};
