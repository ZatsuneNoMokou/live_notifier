let streamListFromSetting_cache = null;

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
						hide: false,
						ignore: false,
						iconIgnore: false,
						notifyOnline: getPreference("notify_online"),
						notifyVocalOnline: getPreference("notify_vocal_online"),
						notifyOffline: getPreference("notify_offline"),
						notifyVocalOffline: getPreference("notify_vocal_offline"),
						streamURL: ""
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
	constructor(checkDuplicates=false){
		this.stringData = getPreference("stream_keys_list");

		this.refresh(checkDuplicates);
	}



	refresh(checkDuplicates=false){
		if(streamListFromSetting_cache === null || !streamListFromSetting_cache.hasOwnProperty("stringData") || streamListFromSetting_cache.stringData !== this.stringData){
			let mapDataAll = parseOldSettings(this.stringData, checkDuplicates);

			this.mapDataAll = mapDataAll;

			// Update cache
			streamListFromSetting_cache = {
				"stringData": this.stringData,
				"mapDataAll": mapDataAll
			}
		} else {
			//consoleMsg("log", "[Live notifier] streamListFromSetting: Using cache");
			if(this.mapDataAll===undefined){
				this.mapDataAll = streamListFromSetting_cache.mapDataAll;
			}
		}
	}

	getWebsiteList(website){
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

	addStream(website, id, url){
		if(!this.streamExist(website, id)){
			this.mapDataAll.get(website).set(id, {streamURL: url});
			this.mapData = this.mapDataAll.get(website);
			consoleMsg("log", `${id} has been added`);
		}
	}

	deleteStream(website, id){
		if(this.streamExist(website, id)){
			this.mapDataAll.get(website).delete(id);
			if(typeof this.mapData !== "undefined"){
				this.mapData.delete(id);
			}
			if(liveStatus.has(website) && liveStatus.get(website).has(id)){
				liveStatus.get(website).delete(id);
			}
			consoleMsg("log", `${id} has been deleted`);
		}
	}

	update(){
		let newStreamPrefArray = [];
		this.mapDataAll.forEach((websiteData, website) => {
			websiteData.forEach((streamSettings, id) => {
				let filters = "";
				for(let j in streamSettings){
					if(!streamSettings.hasOwnProperty(j)){ // Make sure to not loop constructors
						continue;
					}
					if(j !== "streamURL"){
						if(typeof streamSettings[j] === "object" && JSON.stringify(streamSettings[j]) === "[null]"){
							continue;
						}
						if((j === "facebook" || j === "twitter") && streamSettings[j] === ""){
							continue;
						}
						if((j === "hide" || j === "ignore" || j === "iconIgnore") && streamSettings[j] === false){
							continue;
						}
						if(j === "vocalStreamName" && streamSettings[j] === ""){
							continue;
						}
						if(j === "notifyOnline" && streamSettings[j] === getPreference("notify_online")){
							continue;
						}
						if(j === "notifyVocalOnline" && streamSettings[j] === getPreference("notify_vocal_online")){
							continue;
						}
						if(j === "notifyOffline" && streamSettings[j] === getPreference("notify_offline")){
							continue;
						}
						if(j === "notifyVocalOffline" && streamSettings[j] === getPreference("notify_vocal_offline")){
							continue;
						}
						if(typeof streamSettings[j] === "boolean"){
							filters = filters + " " + j + "::" + streamSettings[j];
						}
						if(j === "facebook" || j === "twitter" || j === "vocalStreamName"){
							filters = filters + " " + j + "::" + encodeString(streamSettings[j]);
						} else {
							for(let k in streamSettings[j]){
								if(streamSettings[j].hasOwnProperty(k)){
									filters = filters + " " + j + "::" + encodeString(streamSettings[j][k]);
								}
							}
						}
					}
				}

				let URL = (typeof streamSettings.streamURL !== "undefined" && streamSettings.streamURL !== "")? (" " + streamSettings.streamURL) : "";

				newStreamPrefArray.push(`${website}::${id}${filters}${URL}`);
			})
		});

		let newSettings = newStreamPrefArray.join(", ");
		savePreference("stream_keys_list", newSettings);

		setIcon();
		consoleMsg("log", `Stream key list update: ${getPreference(`stream_keys_list`)}`);
		checkMissing();
	}
}
