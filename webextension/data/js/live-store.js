class LiveStore {
	constructor(){
		this.store = new zDK.DataStore();



		this.CONSTANTS = {
			"channel": "c",
			"live": "l",

			"dailymotion": "d",
			"mixer": "m",
			"openrec_tv": "o",
			"picarto_tv": "p",
			"smashcast": "s",
			"twitch": "t",
			"youtube": "y",

			"c": "channel",
			"l": "live",

			"d": "dailymotion",
			"m": "mixer",
			"o": "openrec_tv",
			"p": "picarto_tv",
			"s": "smashcast",
			"t": "twitch",
			"y": "youtube",
		};

		this.COMPRESSION_DATA = {
			"liveStatus": {
				"API_Status": "A",
				"filteredStatus": "FS",
				"notifiedStatus": "N",
				"notifiedStatus_Vocal": "NV",
				"lastCheckStatus": "CS",
				"liveList": "LL",
				"startedAt": "NSA"
			},
			"streamName": "n",
			"streamStatus": "s",
			"startedAt": "sa",
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



		this.LIVE_STORE_VERSION = "11.3";

		if(!this.store.has("_", "LiveStore_version") || this.store.get("_", "LiveStore_version")!==this.LIVE_STORE_VERSION){
			consoleMsg("warn", "New version of LiveStore, clearing old data.");
			this.store.clear(this.CONSTANTS.channel);
			this.store.clear(this.CONSTANTS.live);
		}

		this.store.set("_", "LiveStore_version", "11.3");
	}

	static getDefaultChannel(website, id){
		const WEBSITE_CHANNEL_ID = /channel::(.*)/;
		return {
			"liveStatus": {
				"API_Status": false,
				"notifiedStatus": false,
				"notifiedStatus_Vocal": false,
				"lastCheckStatus": "",
				"liveList": new Map()
			},
			"streamName": (WEBSITE_CHANNEL_ID.test(id) === true)? WEBSITE_CHANNEL_ID.exec(id)[1] : id,
			"streamStatus": "",
			"streamGame": "",
			"streamOwnerLogo": "",
			"streamCategoryLogo": "",
			"streamCurrentViewers": null,
			"streamURL": "",
			"facebookID": "",
			"twitterID": ""
		}
	}

	static getDefaultLive(website, id, contentId){
		return {
			"liveStatus": {
				"API_Status": false,
				"filteredStatus": false,
				"notifiedStatus": false,
				"notifiedStatus_Vocal": false,
				"lastCheckStatus": "",
				"startedAt": null
			},
			"streamName": contentId,
			"streamStatus": "",
			"startedAt": null,
			"streamGame": "",
			"streamOwnerLogo": "",
			"streamCategoryLogo": "",
			"streamCurrentViewers": null,
			"streamURL": "",
			"facebookID": "",
			"twitterID": ""
		}
	}

	compression(key, id, data){
		let type;
		if(key[0]===this.CONSTANTS["channel"]){
			type = "channel";
		} else if(key[0]===this.CONSTANTS["live"]){
			type = "live";
		}

		if(type!==undefined){
			const website = this.CONSTANTS[key[1]];

			data = DataStore.cloneVariable(data);

			let defaultData;

			if(type==="channel"){
				defaultData = LiveStore.getDefaultChannel(website, id)
			} else if(type==="live"){
				defaultData = LiveStore.getDefaultLive(website, id, (id===""? key[2] : id));
			}

			if(defaultData!==undefined){
				data = DataStore.removeDefault(defaultData, data);
			}
		}

		const result = DataStore.compressWithPattern(data, this.COMPRESSION_DATA);
		DataStore.renameProperty(result, "liveStatus", "l");

		if(result.hasOwnProperty("l") && result.l.hasOwnProperty(this.COMPRESSION_DATA.liveStatus.liveList)){
			result.l[this.COMPRESSION_DATA.liveStatus.liveList] = Array.from(result.l[this.COMPRESSION_DATA.liveStatus.liveList]);
		}

		return result;
	}

	decompression(key, id, data){
		let type;
		if(key[0]===this.CONSTANTS["channel"]){
			type = "channel";
		} else if(key[0]===this.CONSTANTS["live"]){
			type = "live";
		}

		DataStore.renameProperty(data, "l", "liveStatus");

		let result = DataStore.decompressWithPattern(data, this.COMPRESSION_DATA);

		if(result.hasOwnProperty("liveStatus") && result.liveStatus.hasOwnProperty("liveList")){
			result.liveStatus.liveList = new Map(result.liveStatus.liveList);
		}


		if(type!==undefined){
			const website = this.CONSTANTS[key[1]];

			let defaultData;

			if(type==="channel"){
				defaultData = LiveStore.getDefaultChannel(website, id)
			} else if(type==="live"){
				defaultData = LiveStore.getDefaultLive(website, id, (id===""? key[2] : id));
			}

			if(defaultData!==undefined){
				result = DataStore.extendsWithDefault(defaultData, result);
			}
		}

		return result;
	}

	/**
	 *
	 * @param {String} website
	 * @throws Website not in this.constants
	 */
	checkValidWebsite(website){
		if(typeof this.CONSTANTS[website]!=="string"){
			consoleMsg("warn", website);

			throw "UnknownWebsite";
		}
	}

	getChannel(website, id){
		this.checkValidWebsite(website);
		return this.store.get([this.CONSTANTS.channel, this.CONSTANTS[website]], id);
	}

	getLive(website, id, contentId=null){
		this.checkValidWebsite(website);

		if(contentId===null){
			const result = new Map();
			this.forEachLive(website, id, function(website, id, contentId, data){
				result.set(contentId, data);
			});

			return result;
		} else {
			return this.store.get([this.CONSTANTS.live, this.CONSTANTS[website], id], (((id!==contentId))? contentId : ""));
		}
	}

	hasChannel(website, id){
		this.checkValidWebsite(website);

		return this.store.has([this.CONSTANTS.channel, this.CONSTANTS[website]], id);
	}

	hasLive(website, id, contentId){
		this.checkValidWebsite(website);

		if(contentId === undefined){
			return this.store.has([this.CONSTANTS.live, this.CONSTANTS[website]], id);
		} else if(id === contentId){
			return this.store.has([this.CONSTANTS.live, this.CONSTANTS[website], id], "");
		} else {
			return this.store.has([this.CONSTANTS.live, this.CONSTANTS[website], id], contentId);
		}
	}

	setChannel(website, id, data){
		this.checkValidWebsite(website);

		return this.store.set([this.CONSTANTS.channel, this.CONSTANTS[website]], id, data);
	}

	setLive(website, id, contentId, data){
		this.checkValidWebsite(website);

		return this.store.set([this.CONSTANTS.live, this.CONSTANTS[website], id], ((id!==contentId)? contentId : ""), data);
	}

	updateChannel(website, id, fn){
		this.checkValidWebsite(website);

		let data = this.getChannel(website, id);
		data = fn(website, id, data);
		return this.setChannel(website, id, data);
	}

	updateLive(website, id, contentId, fn){
		this.checkValidWebsite(website);

		let data = this.getLive(website, id, contentId);
		data = fn(website, id, contentId, data);
		return this.setLive(website, id, contentId, data);
	}

	removeChannel(website, id){
		this.checkValidWebsite(website);

		return this.store.remove([this.CONSTANTS.channel, this.CONSTANTS[website]], id);
	}

	removeLive(website, id){
		this.checkValidWebsite(website);

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
			this.checkValidWebsite(website);

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
			fn(_this.CONSTANTS[website], id, (contentId!=="")? contentId : id, data);
		}
	}

	/**
	 *
	 * @param {String|Function} arg1
	 * @param {String|Function=} arg2
	 * @param {String|Function=} arg3
	 * @param {String} arg2.website
	 * @param {String} arg2.id
	 * @param {String} arg2.contentId
	 * @param {Object} arg2.data
	 */
	forEachLive(arg1, arg2, arg3){
		if(arguments.length===1 && typeof arg1==="function"){
			this.store.forEach([this.CONSTANTS.live], this.forEachLiveWrapper(arg1));
		} else if(arguments.length===2 && typeof arg1==="string" && typeof arg2==="function") {
			const [website, fn] = arguments;
			this.checkValidWebsite(website);

			this.store.forEach([this.CONSTANTS.live, this.CONSTANTS[website]], this.forEachLiveWrapper(fn));
		} else if(arguments.length===3 && typeof arg1==="string" && typeof arg2==="string" && typeof arg3==="function"){
			const [website, id, fn] = arguments;
			this.checkValidWebsite(website);

			this.store.forEach([this.CONSTANTS.live, this.CONSTANTS[website], id], this.forEachLiveWrapper(fn));
		} else {
			throw "[forEachLive] Wrong arguments";
		}
	}
}
