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
			"string": 3,
			"map": 4
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
	 * @param {Object} sourceData
	 * @param {Object} patternObj
	 * @return {Object}
	 */
	static compressWithPattern(sourceData, patternObj){
		let data = Object.assign({}, sourceData);
		if(typeof data==="object" && data!==null){
			for(let i in patternObj){
				if(!patternObj.hasOwnProperty(i)){
					continue;
				}

				switch (typeof patternObj[i]){
					case "string":
						DataStore.renameProperty(data, i, patternObj[i]);
						break;
					case "object":
						if(data.hasOwnProperty(i)){
							data[i] = DataStore.compressWithPattern(data[i], patternObj[i]);
						}
						break;
					default:
						throw "Unsupported type in compression data.";
				}
			}
		}
		return data;
	}

	/**
	 *
	 * @param {Object} sourceData
	 * @param {Object} patternObj
	 * @return {Object}
	 */
	static decompressWithPattern(sourceData, patternObj){
		let data = Object.assign({}, sourceData);
		if(typeof data==="object" && data!==null){
			for(let i in patternObj){
				if(!patternObj.hasOwnProperty(i)){
					continue;
				}

				switch (typeof patternObj[i]){
					case "string":
						DataStore.renameProperty(data, patternObj[i], i);
						break;
					case "object":
						if(data.hasOwnProperty(i)){
							data[i] = DataStore.decompressWithPattern(data[i], patternObj[i]);
						}
						break;
					default:
						throw "Unsupported type in compression data.";
				}
			}
		}
		return data;
	}

	/**
	 *
	 * @param {Object} object
	 * @param {String} oldName
	 * @param {String} newName
	 * @return {Object}
	 */
	static renameProperty(object, oldName, newName){
		if(object.hasOwnProperty(oldName)) {
			object[newName] = this[oldName];
			delete object[oldName];
		}
		return object;
	}

	/**
	 *
	 * @param {String|String[]} key
	 * @param {String} id
	 * @return {String} storageId
	 */
	static generateStorageId(key, id){
		if(typeof key==="string"){
			return `${key}/${id}`;
		} else if(Array.isArray(key)){
			return `${key.join("/")}/${id}`;
		} else {
			throw "Wrong argument type";
		}
	}

	/**
	 *
	 * @param {String} string
	 * @return {Object} storage
	 * @return {String} storage.key
	 * @return {String[]} storage.keys
	 * @return {String} storage.id
	 */
	static extractStorageId(string){
		const array = string.split("/"),
			keys = array.slice(0, array.length - 1),
			id = array[array.length - 1]
		;

		if(keys.length===1){
			return {
				"key": keys[0],
				"id": id
			};
		} else {
			return {
				"keys": keys,
				"id": id
			};
		}
	}

	/**
	 *
	 * @param {String|String[]} keys
	 * @param {String} id
	 * @param {Boolean|String|Number|JSON} data
	 */
	set(keys, id, data){
		data = this.compressData(keys, data);

		const dataToStore = [];

		if((typeof keys!=="string" || Array.isArray(keys)) && typeof id!=="string"){
			throw "Wrong argument";
		}

		if(data===undefined || data===null){
			throw "Error in data format";
		}

		if(data instanceof Map){
			dataToStore.push(this.types["map"]); // Type
			dataToStore.push(Array.from(data)); // Data
		} else if(typeof data==="object"){
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

		return this.storage.setItem(DataStore.generateStorageId(keys, id), JSON.stringify(dataToStore));
	}

	/**
	 *
	 * @param {String|String[]} keys
	 * @param {String} id
	 * @return {Boolean|String|Number|JSON} data
	 */
	get(keys, id){
		if((typeof keys!=="string" || Array.isArray(keys)) && typeof id==="string"){
			const rawData = JSON.parse(this.storage.getItem(DataStore.generateStorageId(keys, id)));

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
				case this.types.map:
					data = new Map(rawData[1]);
					break;
				default:
					throws `Unexpected type "${rawData[0]}"`;
			}

			return this.decompressData(keys, data);
		} else {
			throw "Wrong argument";
		}
	}

	/**
	 *
	 * @param {String|String[]} keys
	 * @param {String} id
	 * @return {Boolean}
	 */
	has(keys, id){
		if((typeof keys!=="string" || Array.isArray(keys)) && typeof id==="string") {
			return this.storage.getItem(DataStore.generateStorageId(keys, id)) !== null;
		} else {
			throw "Wrong argument";
		}
	}

	/**
	 *
	 * @param {String|String[]} keys
	 * @param {String} id
	 */
	remove(keys, id){
		if((typeof keys!=="string" || Array.isArray(keys)) && typeof id==="string"){
			return this.storage.removeItem(DataStore.generateStorageId(keys, id));
		} else {
			throw "Wrong argument";
		}
	}

	/**
	 *
	 * @param {String} keys
	 * @param {Function} fn
	 */
	forEach(keys, fn){
		for(let i in this.storage){
			if(this.storage.hasOwnProperty(i)){
				let storageIds=null;
				try{
					storageIds = DataStore.extractStorageId(i);
				} catch (e){}

				if(storageIds!==null){
					if(storageIds.hasOwnProperty("key") && storageIds.key===keys){
						fn(storageIds.key, storageIds.id, this.get(storageIds.key, storageIds.id));
					} else if(storageIds.hasOwnProperty("keys")){
						if(storageIds.keys.length >= keys.length){
							let equals = true;

							for(let i=0;i<keys.length;i++){
								if(keys[i]!==storageIds.keys[i]){
									equals = false;
									break;
								}
							}

							if(equals===true){
								fn(storageIds.keys, storageIds.id, this.get(storageIds.keys, storageIds.id));
							}
						}
					}
				}
			}
		}
	}
}