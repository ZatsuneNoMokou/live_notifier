let streamListFromSetting_cache = null;

/**
 *
 * @param {String} settingsStr
 * @param {Boolean=true} checkDuplicates
 * @returns {Map<String, Map<String, JSON>>}
 */
function parseOldSettings(settingsStr, checkDuplicates=true){
	const mapData = new Map(),
		somethingElseThanSpaces = /[^\s]+/,

		reg = /\s*([^\s:]+)::([^\s]+)\s*(.*)?/,
		url = /((?:http|https):\/\/.*)\s*$/,
		filters = /\s*(?:(\w+)::(.+)\s*)/,
		cleanEndingSpace = /(.*)\s+$/
	;

	websites.forEach((websiteAPI, website) => {
		mapData.set(website, new Map());
	});

	if(settingsStr !== "" && somethingElseThanSpaces.test(settingsStr)) {
		let myTable = settingsStr.split(/\s*,\s*/);

		if (myTable.length > 0) {
			for (let item of myTable) {
				let result = reg.exec(item);

				if (result === null) {
					consoleMsg("warn", `Error with ${item}`);
					continue;
				} else if (!(result.length === 3 || result.length === 4)) {
					// Skip invalid items
					continue;
				}

				let [, website, id, data] = result;

				if (website === "hitbox") {
					website = "smashcast";
				}

				if (website === "beam") {
					website = "mixer";
				}


				if (!mapData.has(website)) {
					// Basic information for websites not supported, or not yet
					mapData.set(website, new Map());
				}

				if (checkDuplicates === true) {
					let checkDuplicates_result = "";
					mapData.get(website).forEach((value, i) => {
						if (i.toLowerCase() === id.toLowerCase()) {
							checkDuplicates_result = i;
						}
					});

					if (checkDuplicates_result !== "") {
						consoleMsg("warn", `Found duplicate (${checkDuplicates_result} and ${id})`);
						id = checkDuplicates_result;
					}
				}

				if (!mapData.get(website).has(id)) {
					mapData.get(website).set(id, {
						iconIgnore: false,
						notifyOnline: getPreference("notify_online"),
						notifyVocalOnline: getPreference("notify_vocal_online"),
						notifyOffline: getPreference("notify_offline"),
						notifyVocalOffline: getPreference("notify_vocal_offline")
					});
				}


				if (typeof data !== "undefined") {
					if (url.test(data) === true) {
						let url_result = url.exec(data);
						mapData.get(website).get(id).streamURL = url_result[1];
						data = data.replace(url_result[0], "");
					}

					if (filters.test(data)) {
						let filter_id = /(?:(\w+)::)/;
						let scan_string = data;
						while (filter_id.test(scan_string) === true) {
							let current_filter_result = scan_string.match(filter_id);

							let current_filter_id = current_filter_result[1];

							scan_string = scan_string.substring(current_filter_result.index + current_filter_result[0].length, scan_string.length);

							let next_filter_result = scan_string.match(filter_id);
							let next_pos = (next_filter_result !== null) ? next_filter_result.index : scan_string.length;

							let current_data;
							if (next_filter_result !== null) {
								current_data = scan_string.substring(current_filter_result.index, next_filter_result.index);
							} else {
								current_data = scan_string.substring(current_filter_result.index, scan_string.length);
							}
							if (cleanEndingSpace.test(current_data)) {
								current_data = cleanEndingSpace.exec(current_data)[1];
							}

							if (typeof mapData.get(website).get(id)[current_filter_id] === "undefined") {
								mapData.get(website).get(id)[current_filter_id] = [];
							}

							if (current_filter_id === "hide" || current_filter_id === "ignore" || current_filter_id === "iconIgnore" || current_filter_id === "notifyOnline" || current_filter_id === "notifyVocalOnline" || current_filter_id === "notifyOffline" || current_filter_id === "notifyVocalOffline") {
								let boolean = getBooleanFromVar(current_data);
								if (typeof boolean === "boolean") {
									current_data = boolean;
								} else {
									consoleMsg("warn", `${current_filter_id} of ${id} should be a boolean`);
								}
								mapData.get(website).get(id)[current_filter_id] = current_data;
							} else if (current_filter_id === "facebook" || current_filter_id === "twitter" || current_filter_id === "vocalStreamName") {
								mapData.get(website).get(id)[current_filter_id] = decodeString(current_data);
							} else {
								if (checkDuplicates) {
									let toLowerCase = function (str) {
										return str.toLowerCase();
									};
									if (mapData.get(website).get(id)[current_filter_id].map(toLowerCase).indexOf(decodeString(current_data).toLowerCase()) === -1) {
										mapData.get(website).get(id)[current_filter_id].push(decodeString(current_data));
									} else {
										consoleMsg("warn", `Found duplicate for the setting "${current_filter_id}" from "${id}" (${website}): ${decodeString(current_data)}`);
									}
								} else {
									mapData.get(website).get(id)[current_filter_id].push(decodeString(current_data));
								}
							}
							scan_string = scan_string.substring(next_pos, scan_string.length);
						}
					}
				}
			}
		}
	}

	return mapData;
}



class StreamListFromSetting {
	/**
	 *
	 * @param {Boolean=false} checkDuplicates Does not change anything if doLoadOnInit is false
	 * @param {Boolean=true} doLoadOnInit
	 */
	constructor(checkDuplicates=false, doLoadOnInit=true){

		this.REG_EXPS = {
			URL: /((?:http|https):\/\/.*)\s*$/,
			PRE_CHANNEL: /^channel::/i,
			POST_CHANNEL: /::channel$/i,
			FILTER_ID: /(?:(\w+)::)/
		};

		this.PREF_TYPES = {
			boolean: [
				"iconIgnore",
				"notifyOnline",
				"notifyVocalOnline",
				"notifyOffline",
				"notifyVocalOffline"
			],
			date: [
				"_updated"
			],
			string: [
				"facebook",
				"twitter",
				"vocalStreamName"
			],
			list: [
				"statusBlacklist",
				"statusWhitelist",
				"gameBlacklist",
				"gameWhitelist"
			]
		};

		if (doLoadOnInit === true) {
			this.prefData = getPreference("stream_keys_list");
			this.refresh(checkDuplicates);
		}
	}



	extractSettings(str){
		const data = [];
		let scan_string = "" + str;

		while (this.REG_EXPS.FILTER_ID.test(scan_string) === true) {
			const filter = scan_string.match(this.REG_EXPS.FILTER_ID),
				dataId = filter[1]
			;

			// Extract dataId from the string;
			scan_string = scan_string.substring(filter.index + filter[0].length, scan_string.length);


			let nextFilter = scan_string.match(this.REG_EXPS.FILTER_ID),
				next_pos = (nextFilter !== null) ? nextFilter.index : scan_string.length
			;
			data.push([dataId, scan_string.substring(0, next_pos).trim()]);


			// Extract data from the string
			scan_string = scan_string.substring(next_pos, scan_string.length);
		}

		return data;
	}

	static getDefault(){
		return {
			_updated: '',



			iconIgnore: false,
			notifyOnline: getPreference("notify_online"),
			notifyVocalOnline: getPreference("notify_vocal_online"),
			notifyOffline: getPreference("notify_offline"),
			notifyVocalOffline: getPreference("notify_vocal_offline"),

			statusBlacklist: [],
			statusWhitelist: [],
			gameBlacklist: [],
			gameWhitelist: [],

			vocalStreamName: "",
			facebook: "",
			twitter: ""
		}
	}

	/**
	 *
	 * @param {Object} obj
	 * @return {Proxy}
	 */
	static observeStreamSetting(obj){
		return new Proxy(obj, {
			set: function (obj, propName, newValue) {
				obj._updated = new Date();
				obj[propName] = newValue;

				// Indicate success
				return true;
			}
		});
	}

	/**
	 *
	 * @param {*} date
	 * @return {boolean}
	 */
	static isValidDate(date){
		if(date instanceof Date){
			return Number.isNaN(date.getTime())===false;
		}

		return false;
	}

	/**
	 *
	 * @param {JSON} streamListObj
	 * @return {Map<String, Map<String, JSON>>} Map<Website, Map<StreamId, Settings>>
	 */
	parseSetting(streamListObj){
		if(typeof streamListObj==="string"){
			consoleMsg("warn", "Using old stream list format");
			return parseOldSettings(streamListObj, true);
		}

		const mapDataAll = new Map();

		websites.forEach((value, website)=>{
			if(!mapDataAll.has(website)){
				mapDataAll.set(website, new Map());
			}
		});

		for(let website in streamListObj){
			if(!streamListObj.hasOwnProperty(website)){
				continue;
			}

			let websiteStreams = streamListObj[website];

			let idPrefix = "";
			if(this.REG_EXPS.POST_CHANNEL.test(website)){
				idPrefix = "channel::";
				website = website.replace(this.REG_EXPS.POST_CHANNEL, '');
			}

			for(let id in websiteStreams){
				if(websiteStreams.hasOwnProperty(id)){
					let data = websiteStreams[id];

					// Add channel:: to id AFTER using the websiteStreams
					id = idPrefix + id;

					let outputData;
					if(!mapDataAll.has(website)){
						mapDataAll.set(website, new Map());
					}

					if(!mapDataAll.get(website).has(id)){
						outputData = StreamListFromSetting.getDefault();
					} else {
						outputData = mapDataAll.get(website).get(id);
					}

					if(this.REG_EXPS.URL.test(data)){
						let [,newData,url] = this.REG_EXPS.URL.exec(data);
						outputData.__needUpdate = true; // TODO DELETE setting
						// outputData.streamURL = url;
						data = newData;
					}

					data = this.extractSettings(data);
					data.forEach(item=>{
						const [prefId , data] = item;

						if (this.PREF_TYPES.boolean.includes(prefId) === true) {
							let parsedData = getBooleanFromVar(data);

							if (typeof parsedData !== "boolean") {
								consoleMsg("warn", `${prefId} of ${id} should be a boolean`);
								parsedData = data;
							}

							outputData[prefId] = parsedData;
						} else if (this.PREF_TYPES.string.includes(prefId) === true) {
							outputData[prefId] = decodeString(data);
						} else if (this.PREF_TYPES.date.includes(prefId) === true) {
							const date = new Date(decodeString(data));
							if (StreamListFromSetting.isValidDate(date)) {
								outputData[prefId] = date;
							}
						} else if (this.PREF_TYPES.list.includes(prefId) === true){
							outputData[prefId].push(data);
						} else {
							consoleMsg("warn", `Unknown type ${prefId}`);
							outputData[prefId] = decodeString(data);
						}
					});

					mapDataAll.get(website).set(id, StreamListFromSetting.observeStreamSetting(outputData));
				}
			}
		}

		return mapDataAll;
	}

	refresh(checkDuplicates=false){
		if(streamListFromSetting_cache === null || !streamListFromSetting_cache.hasOwnProperty("prefData") || streamListFromSetting_cache.prefData !== JSON.stringify(this.prefData)){
			this.prefData = getPreference("stream_keys_list");



			this.mapDataAll = this.parseSetting(this.prefData);
			if (typeof this.prefData === "string") {
				consoleMsg("warn", "Migrating stream list format");
				this.update(false);
			}



			// Update cache
			streamListFromSetting_cache = {
				"prefData": JSON.stringify(this.prefData),
				"mapDataAll": this.mapDataAll
			};
		} else {
			//consoleMsg("log", "[Live notifier] streamListFromSetting: Using cache");
			if(this.mapDataAll===undefined){
				this.mapDataAll = streamListFromSetting_cache.mapDataAll;
			}
		}



		/*
		 * Deleted options migration
		 */
		let needUpdate = false;
		this.mapDataAll.forEach(map => {
			map.forEach(item => {
				if (item.hasOwnProperty('__needUpdate') && item.__needUpdate === true) {
					console.warn('needUpdate')
					delete item.__needUpdate;
					needUpdate = true;
				}

				if (item.hasOwnProperty('ignore')) {
					console.warn('ignore')
					delete item.ignore;
					needUpdate = true;
				}
				if (item.hasOwnProperty('hide')) {
					console.warn('hide')
					delete item.hide;
					needUpdate = true;
				}
			})
		});

		if (needUpdate === true) {
			this.update();
		}
	}

	getWebsiteList(website){
		if(this.mapDataAll.has(website)===false){
			consoleMsg("warn", `[StreamListFromSetting] getWebsiteList - Unknown website "${website}"`);
			return new Map();
		}
		return this.mapDataAll.get(website);
	}

	streamExist(website, id){
		let result = false;
		this.mapDataAll.get(website).forEach((value, i) => {
			if(i.toLowerCase() === id.toLowerCase()){
				result = true;
			}
		});
		return result;
	}



	get(website, id){
		if(this.mapDataAll.has(website) && this.mapDataAll.get(website).has(id)){
			return this.mapDataAll.get(website).get(id);
		} else {
			return undefined;
		}
	}

	getExistingId(website, id){
		let result = undefined;
		this.mapDataAll.get(website).forEach((value, i) => {
			if(i.toLowerCase() === id.toLowerCase()){
				result = i;
			}
		});
		return result;
	}

	set(website, id, data){
		if(this.mapDataAll.has(website)===false){
			this.mapDataAll.set(website, new Map());
		}

		this.mapDataAll.get(website).set(id, data);
	}



	addStream(website, id, url){
		if(!this.streamExist(website, id)){
			this.set(website, id, {streamURL: url});
			consoleMsg("log", `${id} has been added`);
		}
	}

	deleteStream(website, id){
		if(this.streamExist(website, id)){
			this.mapDataAll.get(website).delete(id);

			if(liveStore.hasChannel(website, id)){
				liveStore.removeChannel(website, id);
			}
			if(liveStore.hasLive(website, id)){
				liveStore.removeLive(website, id);
			}
			consoleMsg("log", `${id} has been deleted`);
		}
	}

	update(checkMissing=true){
		const defaultValues = StreamListFromSetting.getDefault();

		let newStreamPref = {};

		this.mapDataAll.forEach((websiteData, website) => {
			websiteData.forEach((streamSettings, id) => {
				let filtersArr = [];
				for(let prefId in streamSettings){
					if(!streamSettings.hasOwnProperty(prefId)){ // Make sure to not loop constructors
						continue;
					}

					if (prefId === "streamURL") {
						continue;
					}

					if (typeof streamSettings[prefId] === "object" && JSON.stringify(streamSettings[prefId]) === "[null]") {
						continue;
					}

					if (defaultValues.hasOwnProperty(prefId) && streamSettings[prefId]===defaultValues[prefId]) {
						continue;
					}


					if (this.PREF_TYPES.boolean.includes(prefId) === true) {
						filtersArr.push(prefId + "::" + streamSettings[prefId]);
					} else if (this.PREF_TYPES.string.includes(prefId) === true) {
						filtersArr.push(prefId + "::" + encodeString(streamSettings[prefId]));
					} else if (this.PREF_TYPES.date.includes(prefId) === true) {
						let date = streamSettings[prefId];

						if(StreamListFromSetting.isValidDate(date)){
							date = encodeString(date.toISOString());
						}

						filtersArr.push(prefId + "::" + date);
					} else if (this.PREF_TYPES.list.includes(prefId) === true) {
						for(let k in streamSettings[prefId]){
							if(streamSettings[prefId].hasOwnProperty(k)){
								filtersArr.push(prefId + "::" + encodeString(streamSettings[prefId][k]));
							}
						}
					} else {
						consoleMsg("warn", `Unknown type ${prefId}`);
						filtersArr.push(prefId + "::" + encodeString(streamSettings[prefId]));
					}
				}



				let website_suffixe = "",
					cleanedId = id
				;
				if(this.REG_EXPS.PRE_CHANNEL.test(id)){
					website_suffixe = "::channel";
					cleanedId = id.replace(this.REG_EXPS.PRE_CHANNEL, '');
				}

				if(!newStreamPref.hasOwnProperty(website + website_suffixe)){
					newStreamPref[website + website_suffixe] = {};
				}
				newStreamPref[website + website_suffixe][cleanedId] = `${filtersArr.join(" ")}`;
			})
		});


		savePreference("stream_keys_list", newStreamPref);

		setIcon();
		consoleDir(getPreference(`stream_keys_list`), "Stream key list update");
		if(checkMissing===true){
			appGlobal["checkMissing"]();
		}
	}

	/**
	 *
	 * @param {String} rawNewData
	 * @param {Boolean} isNewer
	 */
	mergeData(rawNewData, isNewer){
		const newData = this.parseSetting(rawNewData),
			newDataKeyMapping = new Map()
		;

		newData.forEach((map, website)=>{
			if(isNewer===true){
				newDataKeyMapping.set(website, new Map());
				Array.from(map.keys()).forEach(function (key){
					newDataKeyMapping.get(website).set(key.toLowerCase(), key);
				});
			}

			map.forEach((streamData, streamId)=>{
				let doUpdate = false,
					existingId = this.getExistingId(website, streamId)
				;

				if(existingId===undefined){
					if(isNewer===true || isNewer===null){
						doUpdate = true;
					}
				} else if(streamData._updated > this.get(website, existingId)._updated){
					doUpdate = true;
				}

				if(doUpdate===true){
					this.set(website, streamId, streamData);
				}
			})
		});

		let updatedMissing = false;
		this.mapDataAll.forEach((map, website)=>{
			map.forEach((streamData, streamId)=>{
				if(isNewer === true && (newDataKeyMapping.has(website) === false || newDataKeyMapping.get(website).has(streamId.toLowerCase()) === false)){
					this.deleteStream(website, streamId);
				} else if(streamData.hasOwnProperty('_updated') === false){
					streamData._updated = new Date();
					updatedMissing = true;
				}
			})
		});

		if(updatedMissing === true){
			this.update();
		}
	}
}
