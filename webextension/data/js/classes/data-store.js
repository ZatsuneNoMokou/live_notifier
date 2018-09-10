class DataStore {
	/**
	 *
	 * @param {Window} win
	 */
	constructor(win=window){
		this.storage = win.localStorage;
		this.window = win;

		this.types = {
			"object": 0,
			"boolean": 1,
			"number": 2,
			"string": 3,
			"map": 4
		};

		this.compressions = new Map();
		this.decompressions = new Map();



		this.DATA_STORE_VERSION = "11.3";

		if(!this.has("_", "DataStore_version") || this.get("_", "DataStore_version")!==this.DATA_STORE_VERSION){
			consoleMsg("warn", "New version of DataStore, clearing old data.");
			this.storage.clear();
		}

		this.set("_", "DataStore_version", "11.3");
	}

	/**
	 *
	 * @param {String} key
	 * @param {Function} fnCompression
	 * @param {Function} fnDecompression
	 * @param {*} context
	 */
	setCompression(key, fnCompression, fnDecompression, context=null){
		if(typeof key!=="string" || typeof fnCompression!=="function" || typeof fnDecompression!=="function"){
			throw "Wrong argument type";
		}

		this.compressions.set(key, [context, fnCompression]);
		this.decompressions.set(key, [context, fnDecompression]);
	}

	/**
	 *
	 * @param {String} key
	 * @param {String} id
	 * @param {*} data
	 */
	compressData(key, id, data){
		let result,
			fn = null
		;

		if(this.compressions.has(key)){
			fn = this.compressions.get(key);
		} else if(Array.isArray(key) && key.length>0){
			if(this.compressions.has(key[0])){
				fn = this.compressions.get(key[0]);
			}
			if(key.length>1){
				for(let i=1;i<key.length;i++){
					const keySlice = key.slice(0, i);
					if(this.compressions.has(keySlice)){
						fn = this.compressions.get(keySlice);
					}
				}
			}
		}

		if(fn===null){
			result = data;
		} else if(fn[0]!==null){
			result = fn[1].call(fn[0], key, id, data);
		} else {
			result = fn[1](key, id, data);
		}

		return result;
	}

	/**
	 *
	 * @param {String} key
	 * @param {String} id
	 * @param {*} data
	 */
	decompressData(key, id, data){
		let result,
			fn = null
		;

		if(this.decompressions.has(key)){
			fn = this.decompressions.get(key);
		} else if(Array.isArray(key) && key.length>0){
			if(this.decompressions.has(key[0])){
				fn = this.decompressions.get(key[0]);
			}
			if(key.length>1){
				for(let i=1;i<key.length;i++){
					const keySlice = key.slice(0, i);
					if(this.decompressions.has(keySlice)){
						fn = this.decompressions.get(keySlice);
					}
				}
			}
		}

		if(fn===null){
			result = data;
		} else if(fn[0]!==null){
			result = fn[1].call(fn[0], key, id, data);
		} else {
			result = fn[1](key, id, data);
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
		let data = DataStore.cloneVariable(sourceData);
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
		let data = DataStore.cloneVariable(sourceData);
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
			object[newName] = DataStore.cloneVariable(object[oldName]);
			delete object[oldName];
		}
		return object;
	}

	static cloneVariable(object){
		if(object instanceof Map){
			return new Map(object);
		} else if(Array.isArray(object)){
			return object.slice(0);
		} else if(object===null){
			return null;
		} else if(typeof object==="object"){
			return Object.assign({}, object);
		} else {
			return object;
		}
	}

	/**
	 * @param {Object} defaultData
	 * @param {Object} data
	 * @returns {Object} Returns `object`.
	 * @see _.defaults
	 */
	static extendsWithDefault(defaultData, data){
		return _.defaultsDeep(data, defaultData);
	}

	/**
	 * @param {Object} defaultData
	 * @param {Object} data to modify
	 * @returns {Object} dat without the defaultData
	 */
	static removeDefault(defaultData, data){
		for(let name in data){
			if(!data.hasOwnProperty(name) || !defaultData.hasOwnProperty(name)){ // If prototype element or nothing to compare
				continue;
			}

			if(typeof data[name]==="object" && data[name]!==null){
				// Recursive call to compare non-null object
				data[name] = DataStore.removeDefault(defaultData[name], data[name]);
			} else if(data[name]===defaultData[name]){
				delete data[name];
			}
		}

		return data;
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
	 * @return {String|Object} storage.id
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
		data = this.compressData(keys, id, data);

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

		this.storage.setItem(DataStore.generateStorageId(keys, id), JSON.stringify(dataToStore));
	}

	/**
	 *
	 * @param {String|String[]} keys
	 * @param {String} id
	 * @return {Boolean|String|Number|JSON} data
	 */
	get(keys, id){
		if((typeof keys==="string" || Array.isArray(keys)) && typeof id==="string"){
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
					throw `Unexpected type "${rawData[0]}"`;
			}

			return this.decompressData(keys, id, data);
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
		if(typeof id!=="string"){
			throw "Wrong argument";
		}

		if(typeof keys==="string"){
			return this.storage.getItem(DataStore.generateStorageId(keys, id)) !== null;
		} else if(Array.isArray(keys)){
			if(this.storage.getItem(DataStore.generateStorageId(keys, id)) !== null){
				return true;
			}

			const arrayToTest = DataStore.cloneVariable(keys);
			arrayToTest.push(id);

			let result = false;
			this.forEach(arrayToTest, ()=>{
				result = true;
				return true;
			}, false);

			return result;
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
		if(typeof id!=="string"){
			throw "Wrong argument";
		}

		if(typeof keys==="string"){
			return this.storage.getItem(DataStore.generateStorageId(keys, id)) !== null;
		} else if(Array.isArray(keys)){
			if(this.storage.getItem(DataStore.generateStorageId(keys, id)) !== null){
				return this.storage.removeItem(DataStore.generateStorageId(keys, id));
			}

			const arrayToTest = DataStore.cloneVariable(keys);
			arrayToTest.push(id);

			this.forEach(arrayToTest, (_keys, _id)=>{
				this.storage.removeItem(DataStore.generateStorageId(_keys, _id));
			}, false);
		} else {
			throw "Wrong argument";
		}
	}

	/**
	 *
	 * @param {String|String[]} keys
	 */
	clear(keys){
		if(typeof keys==="string" ||Array.isArray(keys)){
			this.forEach(keys, (_keys, _id)=>{
				this.storage.removeItem(DataStore.generateStorageId(_keys, _id));
			}, false);
		} else {
			throw "Wrong argument";
		}
	}

	/**
	 *
	 * @param {String|String[]} keys
	 * @param {String} id
	 * @param {Boolean=true} withData
	 * @return {null | Array} Array like [key|keys, id, data] (with data if withData=true)
	 */
	getArgumentsFromStorage(keys, id, withData=true) {
		let storageIds=null;
		try{
			storageIds = DataStore.extractStorageId(id);
		} catch (e){}

		if(storageIds!==null){
			if(storageIds.hasOwnProperty("key") && storageIds.key===keys){
				if(withData===true){
					return [storageIds.key, storageIds.id, this.get(storageIds.key, storageIds.id)];
				} else {
					return [storageIds.key, storageIds.id];
				}
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
						if(withData===true){
							return [storageIds.keys, storageIds.id, this.get(storageIds.keys, storageIds.id)];
						} else {
							return [storageIds.keys, storageIds.id];
						}
					}
				}
			}
		}

		return null;
	}

	/**
	 *
	 * @param {String|String[]} keys
	 * @param {Function} fn Return true to break loop
	 * @param {Boolean=true} withData
	 */
	forEach(keys, fn, withData=true){
		for(let i in this.storage){
			if(this.storage.hasOwnProperty(i)){
				const fnArguments = this.getArgumentsFromStorage(keys, i, withData);

				if (fnArguments !== null && Array.isArray(fnArguments)) {
					let breakLoop = false;

					try {
						breakLoop = fn.apply(this, fnArguments)
					} catch (e) {
						console.error(e);
					}

					if (breakLoop === true) {
						break;
					}
				}
			}
		}
	}

	/**
	 *
	 * @param {String|String[]} keys
	 * @param {function(StorageEvent, String[], String, Boolean):void} fn keys, id, withData
	 * @param {Boolean=true} withData
	 * @param {Window} win
	 */
	onChange(keys, fn, withData=true, win=this.window){
		if(typeof fn !== "function"){
			throw 'WrongArgument';
		}

		const _this = this;
		win.addEventListener("storage", function (event) {
			if (win.localStorage === event.storageArea) {
				const fnArguments = _this.getArgumentsFromStorage(keys, event.key, withData);

				if (fnArguments !== null && Array.isArray(fnArguments)){
					fnArguments.unshift(event);
					fn.apply(_this, fnArguments);
				}
			}
		}, false);
	}
}