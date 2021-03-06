class CommonStore extends DataStore {
	constructor() {
		super();

		this.CONSTANTS = {
			"CommonStore": "cs",
			"cs": "CommonStore"
		};



		this.setCompression(this.CONSTANTS.CommonStore, this.compression, this.decompression, this);



		this.COMMON_STORE_VERSION = "12.0.0.8";

		if (!super.has("_", "CommonStore_version") || super.get("_", "CommonStore_version") !== this.COMMON_STORE_VERSION) {
			consoleMsg("warn", "New version of CommonStore, clearing old data.");
			super.clear(this.CONSTANTS.CommonStore);
		}

		super.set("_", "CommonStore_version", this.COMMON_STORE_VERSION);



		if (this.hasItem('checkingLivesFinished') === false) {
			this.setItem('checkingLivesFinished', true);
		}
	}

	compression(key, id, data){
		data = DataStore.cloneVariable(data);

		if (this.CONSTANTS.CommonStore) {
		}

		return data;
	}

	decompression(key, id, data){
		if (this.CONSTANTS.cs) {
		}

		return data;
	}





	/**
	 *
	 * @param {String} id
	 * @return {Boolean|String|Number|JSON}
	 */
	getItem(id) {
		return super.get(this.CONSTANTS.CommonStore, id);
	}

	/**
	 *
	 * @param {String} id
	 * @return {Boolean}
	 */
	hasItem(id) {
		return super.has(this.CONSTANTS.CommonStore, id);
	}

	/**
	 *
	 * @param {String} id
	 * @param {Boolean|String|Number|JSON} data
	 */
	setItem(id, data) {
		return super.set(this.CONSTANTS.CommonStore, id, data);
	}



	updateItem(id, fn) {
		let data = this.get(id);
		data = fn(id, data);
		return this.set(id, data);
	}



	// noinspection JSCheckFunctionSignatures
	removeItem(id) {
		return super.remove(this.CONSTANTS.CommonStore, id);
	}



	forEachWrapper(fn) {
		return function (key, id, data) {
			fn(id, data);
		}
	}

	/**
	 *
	 * @param {Function=} fn Callback function
	 * @param {String} fn.id
	 * @param {*} fn.data
	 */
	forEachItem(fn){
		if (typeof fn === "function") {
			super.forEach(this.CONSTANTS.CommonStore, this.forEachWrapper(fn));
		} else {
			throw "Wrong arguments";
		}
	}



	/**
	 *
	 * @param {Function} fn
	 * @param {String} watchedId
	 * @return {function(StorageEvent, String, String, Object):void} fn event, id, data
	 */
	onChangeWrapper(fn, watchedId=null) {
		return function (e, key, id, data) {
			if (watchedId === null || watchedId === id) {
				fn(e, id, data);
			}
		}
	}

	/**
	 *
	 * @param {function(StorageEvent, String, Object):void} fn event, id, data
	 * @param {Boolean=false} withData
	 * @param {Window} win
	 */
	onItemChange(fn, withData=false, win=this.window) {
		super.onChange(this.CONSTANTS.CommonStore, this.onChangeWrapper(fn), withData, win);
	}

	/**
	 *
	 * @param {function(StorageEvent, String, Object):void} fn event, id, data
	 * @param {String} id
	 * @param {Window} win
	 */
	onIdChange(fn, id, win=this.window) {
		if (typeof id !== "string" || id === "") {
			throw 'WrongArguments';
		}

		super.onChange(this.CONSTANTS.CommonStore, this.onChangeWrapper(fn, id), false, win);
	}
}
