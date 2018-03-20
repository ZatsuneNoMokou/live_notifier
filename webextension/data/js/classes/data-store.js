class DataStore {
	/**
	 *
	 * @param {Window} win
	 */
	constructor(win=window){
		this.storage = win.localStorage;

		this.compressions = new Map();
		this.decompressions = new Map();
	}

	/**
	 *
	 * @param {String} key
	 * @param {function} fnCompression
	 * @param {function} fnDecompression
	 */
	setCompression(key, fnCompression, fnDecompression){
		if(typeof key!=="string" || typeof fnCompression!=="function" || typeof fnDecompression!=="function"){
			throw "Wrong argument type";
		}

		this.compressions.set(key, fnCompression);
		this.decompressions.set(key, fnDecompression);
	}

	/**
	 *
	 * @param {String} key
	 * @param {*} data
	 */
	compressData(key, data){
		let result;

		if(this.compressions.has(key)){
			result = this.compressions.get(key)(data);
		} else {
			result = data;
		}

		return result;
	}

	/**
	 *
	 * @param {String} key
	 * @param {*} data
	 */
	decompressData(key, data){
		let result;

		if(this.decompressions.has(key)){
			result = this.decompressions.get(key)(data);
		} else {
			result = data;
		}

		return result;
	}

	/**
	 *
	 * @param {string} key
	 * @param {string} id
	 * @return {string} storageId
	 */
	static generateStorageId(key, id){
		return `${key}/${id}`;
	}

	/**
	 *
	 * @param {string} key
	 * @param {string} id
	 * @param {boolean|string|number|JSON} data
	 */
	set(key, id, data){
		data = this.compressData(key, data);

		if(typeof key!=="string" && typeof id!=="string"){
			throw "Wrong argument";
		}

		if(data===undefined || data===null){
			throw "Error in data format";
		}

		if(typeof data==="object"){
			let jsonString = null;
			try{
				jsonString = JSON.stringify(data);
			} catch (e){}

			if(jsonString===null){
				throw "Error with JSON.stringify()";
			} else {
				data = jsonString;
			}
		} else if(typeof data!=="string" && typeof data!=="boolean"){
			throw "Data type error";
		}

		return this.storage.setItem(DataStore.generateStorageId(key, id), data);
	}

	/**
	 *
	 * @param {string} key
	 * @param {string} id
	 * @return {boolean|string|number|JSON} data
	 */
	get(key, id){
		if(typeof key==="string" && typeof id==="string"){
			return this.decompressData(key, this.storage.getItem(DataStore.generateStorageId(key, id)));
		} else {
			throw "Wrong argument";
		}
	}

	/**
	 *
	 * @param {string} key
	 * @param {string} id
	 * @return {boolean}
	 */
	has(key, id){
		if(typeof key==="string" && typeof id==="string") {
			return this.storage.getItem(DataStore.generateStorageId(key, id)) !== null;
		} else {
			throw "Wrong argument";
		}
	}

	/**
	 *
	 * @param {string} key
	 * @param {string} id
	 */
	remove(key, id){
		if(typeof key==="string" && typeof id==="string"){
			return this.storage.removeItem(DataStore.generateStorageId(key, id));
		} else {
			throw "Wrong argument";
		}
	}
}