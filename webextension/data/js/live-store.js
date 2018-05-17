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

	getLive(website, id, contentId=null){
		if(contentId===null){
			const result = new Map();
			this.forEachLive(website, id, function(website, id, contentId, data){
				result.set(contentId, data);
			});

			return result;
		} else {
			let keys = [this.CONSTANTS.live, this.CONSTANTS[website]];

			if(id!==contentId){
				keys.push(id);
			}

			return this.store.get(keys, contentId);
		}
	}

	hasChannel(website, id){
		return this.store.has([this.CONSTANTS.channel, this.CONSTANTS[website]], id);
	}

	hasLive(website, id, contentId){
		if(contentId === undefined){
			return this.store.has([this.CONSTANTS.live, this.CONSTANTS[website]], id);
		} else {
			return this.store.has([this.CONSTANTS.live, this.CONSTANTS[website], id], contentId);
		}
	}

	setChannel(website, id, data){
		return this.store.set([this.CONSTANTS.channel, this.CONSTANTS[website]], id, data);
	}

	setLive(website, id, contentId, data){
		if(id===contentId){
			return this.store.set([this.CONSTANTS.live, this.CONSTANTS[website]], id, data);
		} else {
			return this.store.set([this.CONSTANTS.live, this.CONSTANTS[website], id], contentId, data);
		}
	}

	updateChannel(website, id, fn){
		let data = this.getChannel(website, id);
		data = fn(website, id, data);
		return this.setChannel(website, id, data);
	}

	updateLive(website, id, contentId, fn){
		let data = this.getLive(website, id, contentId);
		data = fn(website, id, contentId, data);
		return this.setLive(website, id, contentId, data);
	}

	removeChannel(website, id){
		return this.store.remove([this.CONSTANTS.channel, this.CONSTANTS[website]], id);
	}

	removeLive(website, id){
		return this.store.remove([this.CONSTANTS.live, this.CONSTANTS[website]], id);
	}

	forEachChannelWrapper(fn){
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
			this.store.forEach([this.CONSTANTS.channel, this.CONSTANTS[website]], this.forEachChannelWrapper(fn));
		} else if(arguments.length===1 && typeof arg1==="function"){
			this.store.forEach([this.CONSTANTS.channel], this.forEachChannelWrapper(arg1));
		} else {
			throw "Wrong arguments";
		}
	}

	forEachLiveWrapper(fn){
		const _this = this;
		return function (keys, contentId, data) {
			const [,website, id] = keys;
			fn(_this.CONSTANTS[website], (keys.length===3)? id : contentId, contentId, data);
		}
	}

	/**
	 *
	 * @param {String=} arg1
	 * @param {Function} arg2
	 * @param {String} arg2.website
	 * @param {String} arg2.id
	 * @param {String} arg2.contentId
	 * @param {Object} arg2.data
	 */
	forEachLive(arg1, arg2){
		if(arguments.length===1 && typeof arg1==="function"){
			this.store.forEach([this.CONSTANTS.live], this.forEachFnWrapper(arg1));
		} else if(arguments.length===2 && typeof arg1==="string" && typeof arg2==="function") {
			const [website, fn] = arguments;
			this.store.forEach([this.CONSTANTS.live, this.CONSTANTS[website]], this.forEachLiveWrapper(fn));
		} else if(arguments.length===3 && typeof arg1==="string" && typeof arg2==="string" && typeof arg3==="function"){
			const [website, id, fn] = arguments;
			this.store.forEach([this.CONSTANTS.live, this.CONSTANTS[website], id], this.forEachLiveWrapper(fn));
		} else {
			throw "Wrong arguments";
		}
	}
}
