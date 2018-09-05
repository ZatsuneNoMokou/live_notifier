class CommonStore extends DataStore {
	constructor() {
		super();

		this.CONSTANTS = {
			"CommonStore": "cs",
			"cs": "CommonStore"
		};



		this.setCompression(this.CONSTANTS.channel, CommonStore.compression, CommonStore.decompression, this);



		this.COMMON_STORE_VERSION = "12.0.0.8";

		if(!this.has("_", "CommonStore_version") || this.get("_", "CommonStore_version")!==this.COMMON_STORE_VERSION){
			consoleMsg("warn", "New version of CommonStore, clearing old data.");
			this.clear(this.CONSTANTS.CommonStore);
		}

		this.set("_", "CommonStore_version", this.COMMON_STORE_VERSION);
	}


	/**
	 *
	 * @param {String} id
	 * @return {*}
	 */
	static getDefault(id){
		return undefined;
	}


	static compression(key, id, data){
		data = DataStore.cloneVariable(data);

		const defaultData = CommonStore.getDefault(id);
		if (defaultData !== undefined) {
			data = DataStore.removeDefault(defaultData, data);
		}

		return data;
	}

	static decompression(key, id, data){
		const defaultData = CommonStore.getDefault(id);
		if (defaultData !== undefined) {
			result = DataStore.extendsWithDefault(defaultData, data);
		}

		return result;
	}





	// noinspection JSCheckFunctionSignatures
	/**
	 *
	 * @param {String} id
	 * @return {Boolean|String|Number|JSON}
	 */
	get(id){
		return super.get(this.CONSTANTS.CommonStore, id);
	}

	// noinspection JSCheckFunctionSignatures
	/**
	 *
	 * @param {String} id
	 * @return {Boolean}
	 */
	has(id){
		return super.has(this.CONSTANTS.CommonStore, id);
	}

	// noinspection JSCheckFunctionSignatures
	/**
	 *
	 * @param {String} id
	 * @param {Boolean|String|Number|JSON} data
	 */
	set(id, data){
		return super.set(this.CONSTANTS.CommonStore, id, data);
	}



	update(id, fn){
		let data = this.get(id);
		data = fn(id, data);
		return this.set(id, data);
	}



	// noinspection JSCheckFunctionSignatures
	remove(id){
		return super.remove(this.CONSTANTS.CommonStore, id);
	}



	forEachWrapper(fn){
		return function (key, id, data) {
			fn(id, data);
		}
	}

	// noinspection JSCheckFunctionSignatures
	/**
	 *
	 * @param {Function=} fn Callback function
	 * @param {String} fn.id
	 * @param {*} fn.data
	 */
	forEach(fn){
		if(typeof fn==="function"){
			super.forEach(this.CONSTANTS.CommonStore, this.forEachWrapper(fn));
		} else {
			throw "Wrong arguments";
		}
	}



	onChangeWrapper(fn){
		return function (e, key, id, data) {
			fn(e, id, data);
		}
	}

	// noinspection JSCheckFunctionSignatures
	/**
	 *
	 * @param {function(StorageEvent, String, Object):void} fn event, id, data
	 * @param {Boolean=false} withData
	 * @param {Window} win
	 */
	onChange(fn, withData=false, win=this.window) {
		super.onChange(this.CONSTANTS.CommonStore, this.onChangeWrapper(fn), withData, win);
	}
}