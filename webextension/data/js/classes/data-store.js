class DataStore {
	/**
	 *
	 * @param {Window} win
	 */
	constructor(win=window){
		this.storage = win.localStorage;

		this.types = {
			"object": 0,
			"boolean": 1,
			"number": 2,
			"string": 3
		};

		this.compressions = new Map();
		this.decompressions = new Map();
	}

	/**
	 *
	 * @param {String} key
	 * @param {Function} fnCompression
	 * @param {Function} fnDecompression
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
	 * @param {String} key
	 * @param {String} id
	 * @return {String} storageId
	 */
	static generateStorageId(key, id){
		return `${key}/${id}`;
	}

	/**
	 *
	 * @param {String} string
	 * @return {Object} storage
	 * @return {String} storage.key
	 * @return {String} storage.id
	 */
	static extractStorageId(string){
		const extractReg = /^([^\/]*)\/(.*)$/,
			result = extractReg.exec(string)
		;

		if(result!==null){
			return {
				"key": result[1],
				"id": result[2]
			};
		} else {
			throw "Could not extract key and id";
		}
	}

	/**
	 *
	 * @param {String} key
	 * @param {String} id
	 * @param {Boolean|String|Number|JSON} data
	 */
	set(key, id, data){
		data = this.compressData(key, data);

		const dataToStore = [];

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
				dataToStore.push(this.types[typeof data]); // Type
				dataToStore.push(data); // Data
			}
		} else if(typeof data!=="string" && typeof data!=="boolean" && typeof data!=="number"){
			throw "Data type error";
		} else {
			dataToStore.push(this.types[typeof data]); // Type

			if(typeof data==="boolean"){
				dataToStore.push((data===true)? 1 : 0); // Data
			} else {
				dataToStore.push(data); // Data
			}
		}

		return this.storage.setItem(DataStore.generateStorageId(key, id), JSON.stringify(dataToStore));
	}

	/**
	 *
	 * @param {String} key
	 * @param {String} id
	 * @return {Boolean|String|Number|JSON} data
	 */
	get(key, id){
		if(typeof key==="string" && typeof id==="string"){
			const rawData = JSON.parse(this.storage.getItem(DataStore.generateStorageId(key, id)));

			let data = null;
			switch (rawData[0]){
				case this.types.object:
					data = rawData[1];
					break;
				case this.types.boolean:
					if(typeof rawData[1]==="string"){
						rawData[1] = Number.parseInt(rawData[1]);
					}
					data = rawData[1]===1;
					break;
				case this.types.number:
					data = Number.parseFloat(rawData[1]);
					break;
				case this.types.string:
					data = rawData[1];
					break;
				default:
					throws `Unexpected type "${rawData[0]}"`;
			}

			return this.decompressData(key, data);
		} else {
			throw "Wrong argument";
		}
	}

	/**
	 *
	 * @param {String} key
	 * @param {String} id
	 * @return {Boolean}
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
	 * @param {String} key
	 * @param {String} id
	 */
	remove(key, id){
		if(typeof key==="string" && typeof id==="string"){
			return this.storage.removeItem(DataStore.generateStorageId(key, id));
		} else {
			throw "Wrong argument";
		}
	}

	/**
	 *
	 * @param {String} key
	 * @param {Function} fn
	 */
	forEach(key, fn){
		for(let i in this.storage){
			if(this.storage.hasOwnProperty(i)){
				let storageIds=null;
				try{
					storageIds = DataStore.extractStorageId(i);
				} catch (e){}

				if(storageIds!==null && storageIds.key===key){
					fn(storageIds.key, storageIds.id, this.get(storageIds.key, storageIds.id));
				}
			}
		}
	}
}