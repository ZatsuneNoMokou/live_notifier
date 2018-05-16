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

			"c": "channel",
			"l": "live",

			"d": "dailymotion",
			"m": "mixer",
			"p": "picarto_tv",
			"s": "smashcast",
			"t": "twitch",
			"y": "youtube",
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

		this.store.setCompression(this.CONSTANTS.channel, this.compression, this.decompression, this);
		this.store.setCompression(this.CONSTANTS.live, this.compression, this.decompression, this);
	}

	compression(key, data){
		const result = DataStore.compressWithPattern(data, this.COMPRESSION_DATA);
		console.dir(result)
		DataStore.renameProperty(result, "liveStatus", "l");

		if(result.hasOwnProperty("l") && result.l.hasOwnProperty(this.COMPRESSION_DATA.liveStatus.liveList)){
			result.l[this.COMPRESSION_DATA.liveStatus.liveList] = Array.from(result.l[this.COMPRESSION_DATA.liveStatus.liveList]);
		}

		return result;
	}

	decompression(key, data){
		let result = DataStore.decompressWithPattern(data, this.COMPRESSION_DATA);
		DataStore.renameProperty(result, "l", "liveStatus");

		if(result.hasOwnProperty("liveStatus") && result.liveStatus.hasOwnProperty("liveList")){
			result.liveStatus.liveList = new Map(result.liveStatus.liveList);
		}

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

	updateChannel(website, id, fn){
		let data = this.getChannel(website, id);
		data = fn(website, id, data);
		return this.setChannel(website, id, data);
	}

	updateLive(website, id, fn){
		let data = this.getLive(website, id);
		data = fn(website, id, data);
		return this.setLive(website, id, data);
	}

	removeChannel(website, id){
		return this.store.remove([this.CONSTANTS.channel, this.CONSTANTS[website]], id);
	}

	removeLive(website, id){
		return this.store.set([this.CONSTANTS.live, this.CONSTANTS[website]], id);
	}

	forEachFnWrapper(fn){
		const _this = this;
		return function (keys, id, data) {
			const [,website] = keys;
			fn(_this.CONSTANTS[website], id, data);
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
	forEachChannel(arg1, arg2){
		if(arguments.length===2 && typeof arg1==="string" && typeof arg2==="function"){
			const [website, fn] = arguments;
			this.store.forEach([this.CONSTANTS.channel, this.CONSTANTS[website]], this.forEachFnWrapper(fn));
		} else if(arguments.length===1 && typeof arg1==="function"){
			this.store.forEach([this.CONSTANTS.channel], this.forEachFnWrapper(arg1));
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
			this.store.forEach([this.CONSTANTS.live, this.CONSTANTS[website]], this.forEachFnWrapper(fn));
		} else if(arguments.length===1 && typeof arg1==="function"){
			this.store.forEach([this.CONSTANTS.live], this.forEachFnWrapper(arg1));
		} else {
			throw "Wrong arguments";
		}
	}
}
