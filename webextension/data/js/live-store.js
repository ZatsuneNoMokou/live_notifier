class LiveStore {
	constructor(){
		this.store = new zDK.DataStore();

		this.CONSTANTS = {
			"channel": "c",
			"live": "l",

			"dailymotion": "d",
			"mixer": "m",
			"picarto_tv": "p",
			"smashcast": "s",
			"twitch": "t",
			"youtube": "y",
		};

		this.COMPRESSION_DATA = {
			"liveStatus": {
				"API_Status": "A",
				"notifiedStatus": "N",
				"notifiedStatus_Vocal": "NV",
				"lastCheckStatus": "CS",
				"liveList": "LL"
			},
			"streamName": "n",
			"streamStatus": "s",
			"streamGame": "g",
			"streamOwnerLogo": "ol",
			"streamCategoryLogo": "cl",
			"streamCurrentViewers": "cv",
			"streamURL": "u",
			"facebookID": "f",
			"twitterID": "t"
		};

		this.store.setCompression(this.CONSTANTS.channel, this.compression, this.decompression);
		this.store.setCompression(this.CONSTANTS.live, this.compression, this.decompression);
	}

	compression(key, data){
		const result = DataStore.compressWithPattern(data, this.COMPRESSION_DATA);
		DataStore.renameProperty(result, "liveStatus", "l");
		return result;
	}

	decompression(key, data){
		let result = DataStore.decompressWithPattern(data, this.COMPRESSION_DATA);
		DataStore.renameProperty(result, "l", "liveStatus");
		return result;
	}

	getChannel(website, id){
		return this.store.get([this.CONSTANTS.channel, this.CONSTANTS[website]], id);
	}

	getLive(website, id){
		return this.store.get([this.CONSTANTS.live, this.CONSTANTS[website]], id);
	}

	hasChannel(website, id){
		return this.store.has([this.CONSTANTS.channel, this.CONSTANTS[website]], id);
	}

	hasLive(website, id){
		return this.store.has([this.CONSTANTS.live, this.CONSTANTS[website]], id);
	}

	setChannel(website, id, data){
		return this.store.set([this.CONSTANTS.channel, this.CONSTANTS[website]], id, data);
	}

	setLive(website, id, data){
		return this.store.set([this.CONSTANTS.live, this.CONSTANTS[website]], id, data);
	}

	forEachFnWrapper(keys, id, data, fn){
		const [,website] = keys;
		fn(this.CONSTANTS[website], id, data);
	}

	/**
	 *
	 * @param {String=} arg1
	 * @param {Function} arg2
	 * @param {String} arg2.website
	 * @param {String} arg2.id
	 * @param {Object} arg2.data
	 */
	forEachChannel(arg1, arg2){
		if(arguments.length===2 && typeof arg1==="string" && typeof arg2==="function"){
			const [website, fn] = arguments;
			this.store.forEach([this.CONSTANTS.channel, this.CONSTANTS[website]], forEachFnWrapper(fn));
		} else if(arguments.length===1 && typeof arg1==="function"){
			this.store.forEach([this.CONSTANTS.channel], forEachFnWrapper(arg1));
		} else {
			throw "Wrong arguments";
		}
	}


	/**
	 *
	 * @param {String=} arg1
	 * @param {Function} arg2
	 * @param {String} arg2.website
	 * @param {String} arg2.id
	 * @param {Object} arg2.data
	 */
	forEachLive(arg1, arg2){
		if(arguments.length===2 && typeof arg1==="string" && typeof arg2==="function"){
			const [website, fn] = arguments;
			this.store.forEach([this.CONSTANTS.live, this.CONSTANTS[website]], forEachFnWrapper(fn));
		} else if(arguments.length===1 && typeof arg1==="function"){
			this.store.forEach([this.CONSTANTS.live], forEachFnWrapper(arg1));
		} else {
			throw "Wrong arguments";
		}
	}
}
