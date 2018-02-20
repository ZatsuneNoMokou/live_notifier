const fs = require('fs-extra'),
	klaw = require('klaw')
;

/**
 *
 * @param {String} filePath
 * @param {Function} fn
 * @return {Promise<void>}
 */
async function modifyFile(filePath, fn) {
	let data = await fs.readFile(filePath, 'utf8');

	data = fn.call(this, data, filePath);

	if(data===undefined){
		await fs.remove(filePath);
	} else {
		await fs.writeFile(filePath, data, 'utf8');
	}
}
/*
modifyFile("./thth.txt", function (data) {
	if(data.indexOf("undefined")===-1){
		return data;
	}
})
.catch(console.warn)
*/





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
	"modifyFile": modifyFile,
	"getFilesRecursively": getFilesRecursively,
	"modifyFiles": modifyFiles
};
