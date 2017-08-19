'use strict';

// appGlobal: Accessible with browser.extension.getBackgroundPage();
var appGlobal = {};

let myIconURL = "/data/live_offline.svg";

let websites = new Map();
appGlobal["websites"] = websites;
let liveStatus = new Map();
appGlobal["liveStatus"] = liveStatus;
let channelInfos = new Map();
appGlobal["channelInfos"] = channelInfos;

function consoleMsg(level,str){
	let msg = (typeof str.toString === "function")? str.toString() : str;
	if(getPreference("showAdvanced") && getPreference("showExperimented")){
		if(typeof console[level] === "function"){
			console[level](str);
		} else {
			consoleMsg("log", msg);
		}
	}
}
appGlobal["consoleMsg"] = consoleMsg;

function consoleDir(obj,str){
	if(getPreference("showAdvanced") && getPreference("showExperimented")){
		if(typeof str === "string" || (typeof str !== "undefined" && typeof str.toString === "function")){
			console.group((typeof str === "string")? str : str.toString());
			console.dir(obj);
			console.groupEnd();
		} else {
			console.dir(obj);
		}
	}
}
appGlobal["consoleDir"] = consoleDir;

class Params extends Map {
	encode() {
		const array = [];
		this.forEach((value, key) => {
			array.push((value || typeof value === 'boolean')? `${encodeURI(key)}=${encodeURI(value)}` : `${encodeURI(key)}`);
		});
		
		return array.join('&');
	}
}
function mapToObj(myMap){
	if(myMap instanceof Map){
		let obj = {};
		myMap.forEach((value, index, array) => {
			obj[index] = (value instanceof Map)? mapToObj(value) : value;
		});
		return obj;
	} else {
		throw 'myMap should be an Map';
	}
}
appGlobal["mapToObj"] = mapToObj;

const splitUri = (function() { // https://codereview.stackexchange.com/questions/9574/faster-and-cleaner-way-to-parse-parameters-from-url-in-javascript-jquery/9630#9630
	var splitRegExp = new RegExp(
		'^' +
		'(?:' +
		'([^:/?#.]+)' +                         // scheme - ignore special characters
		// used by other URL parts such as :,
		// ?, /, #, and .
		':)?' +
		'(?://' +
		'(?:([^/?#]*)@)?' +                     // userInfo
		'([\\w\\d\\-\\u0100-\\uffff.%]*)' +     // domain - restrict to letters,
		// digits, dashes, dots, percent
		// escapes, and unicode characters.
		'(?::([0-9]+))?' +                      // port
		')?' +
		'([^?#]+)?' +                           // path
		'(?:\\?([^#]*))?' +                     // query
		'(?:#(.*))?' +                          // fragment
		'$')
	;

	return function (uri) {
		let split;
		split = uri.match(splitRegExp);
		return {
			'scheme':split[1],
			'user_info':split[2],
			'domain':split[3],
			'port':split[4],
			'path':split[5],
			'query_data': split[6],
			'fragment':split[7]
		}
	};
})();
function Request(options){
	if(typeof options.url !== "string" && typeof options.onComplete !== "function"){
		consoleMsg("warn", "Error in options");
	} else {
		let core = function(method){
			let xhr;
			if(typeof options.anonymous === "boolean"){
				xhr = new XMLHttpRequest({anonymous:options.anonymous});
			} else {
				xhr = new XMLHttpRequest();
			}
			
			let content = (Array.isArray(options.content) || options.content instanceof Map)? options.content : [];
			if(method === 'GET'){
				// Extract query data from url to put it with the other
				const urlObj = splitUri(options.url);
				if(typeof urlObj.query_data === "string" && urlObj.query_data !== ""){
					let urlQuery = urlObj.query_data.split("&").map(value=>{
						return value.split("=");
					});
					if(Array.isArray(urlQuery)){
						if(Array.isArray(content)){
							content = urlQuery.concat(content);
						} else {
							content = urlQuery;
						}
						options.url = options.url.replace("?"+urlObj.query_data, "");
					}
				}
			}

			const params = new Params(content);

			xhr.open(method, ((method === 'GET')? `${options.url}${(params.size > 0)? `?${params.encode()}` : ""}` : options.url), true);
			
			if(typeof options.contentType === "string"){
				xhr.responseType = options.contentType;
			}
			if(typeof options.overrideMimeType === "string"){
				xhr.overrideMimeType(options.overrideMimeType);
			}
			
			xhr.timeout = getPreference("timeout_delay") * 1000;
			
			if(options.hasOwnProperty("headers") === true && typeof options.headers === "object"){
				for(let header in options.headers){
					if(!options.headers.hasOwnProperty(header)){ // Make sure to not loop constructors
						continue;
					}
					let value = options.headers[header];
					xhr.setRequestHeader(header, value);
				}
			}
			
			xhr.addEventListener("loadend", function(){
				let response = {
					"url": xhr.responseURL,
					"json": null,
					"status": xhr.status,
					"statusText": xhr.statusText,
					"header": xhr.getAllResponseHeaders()
				};
				if(xhr.responseType === "" || xhr.responseType === "text"){
					response.text= xhr.responseText;
				}
				if(typeof xhr.response !== "undefined"){
					response.response = xhr.response;
				}
				
				if(typeof options.customJSONParse === "string"){
					switch(options.customJSONParse){
						case "xmlToJSON":
							if(typeof xhr.responseXML === "undefined" || xhr.responseXML === null){
								response.json = null;
							} else {
								let xmlToStringParser = new XMLSerializer();
								let xmlText = xmlToStringParser.serializeToString(xhr.responseXML);
								
								try{
									// Source: https://www.sitepoint.com/how-to-convert-xml-to-a-javascript-object/
									let rawData = XML2jsobj(xhr.responseXML.documentElement);
									let data = {};
									
									/**		Flatten the object a bit		**/
									if(rawData.hasOwnProperty("body")){
										data = rawData.body;
										if(rawData.hasOwnProperty("version")){
											data.version = rawData.version;
										}
									} else {
										data = rawData;
									}
									/**		End flatten the object a bit		**/
									
									response.json = data;
								}
								catch(error){
									response.json = null;
								}
							}
							break;
						case "urlencodedToJSON":
							let jsonDATA = {};
							let splitedData = xhr.responseText.split("&");

							splitedData = splitedData.map((str)=>{
								return str.split("=");
							});
							for(let item of splitedData){
								jsonDATA[decodeURIComponent(item[0])] = decodeURIComponent(item[1]);
							}
							response.json = jsonDATA;
							break;
						default:
							consoleMsg("warn", `[Request] Unknown custom JSON parse ${options.customJSONParse}`);
					}
				} else if(xhr.responseType === "document" && typeof options.Request_documentParseToJSON === "function"){
					let result = options.Request_documentParseToJSON(xhr);
					if(result instanceof Map){
						response.map = result;
						response.json = mapToObj(result);
					} else {
						response.json = result;
					}
				} else {
					try{response.json = JSON.parse(xhr.responseText);}
					catch(error){response.json = null;}
				}
				options.onComplete(response);
			});
			
			if(method === 'GET'){
				xhr.send();
			} else if(method === 'POST'){
				xhr.send(params.encode());
			} else {
				throw `Unknown method "${method}"`
			}
		};

		return {
			'get' : function() {
				return core('GET');
			},
			'post' : function() {
				return core('POST');
			}
		};
	}
}

function mapToObj(myMap){
	if(myMap instanceof Map){
		let obj = {};
		myMap.forEach((value, index) => {
			obj[index] = (value instanceof Map)? mapToObj(value) : value;
		});
		return obj;
	} else {
		throw 'myMap should be an Map';
	}
}
let streamListFromSetting_cache = null;
class streamListFromSetting{
	constructor(requested_website, checkDuplicates=false){
		let somethingElseThanSpaces = /[^\s]+/;
		this.stringData = getPreference("stream_keys_list");
		let pref = new String(this.stringData);
		
		if(streamListFromSetting_cache !== null && streamListFromSetting_cache.hasOwnProperty("stringData") && streamListFromSetting_cache.stringData == pref){
			//consoleMsg("log", "[Live notifier] streamListFromSetting: Using cache")
			this.mapDataAll = streamListFromSetting_cache.mapDataAll;
			//this.objDataAll = mapToObj(this.mapDataAll);
			if(typeof requested_website === "string" && requested_website !== ""){
				this.mapData = this.mapDataAll.get(requested_website);
				//this.objData = this.objDataAll[requested_website];
				this.website = requested_website;
			}
			return this;
		}
		
		let mapDataAll = new Map();
		
		websites.forEach((websiteAPI, website) => {
			mapDataAll.set(website, new Map());
		});
		
		if(pref !== "" && somethingElseThanSpaces.test(pref)){
			let myTable = pref.split(/\s*,\s*/);
			let reg= /\s*([^\s\:]+)\:\:([^\s]+)\s*(.*)?/;
			if(myTable.length > 0){
				for(let item of myTable){
					let url = /((?:http|https):\/\/.*)\s*$/;
					let filters = /\s*(?:(\w+)\:\:(.+)\s*)/;
					let cleanEndingSpace = /(.*)\s+$/;
					
					
					let result=reg.exec(item);
					if(result === null){
						consoleMsg("warn", `Error with ${item}`);
						continue;
					}
					let website = result[1];
					let id = result[2];
					let data = result[3];

					if(website === "hitbox"){
						website = "smashcast";
					}
					if(website === "beam"){
						website = "mixer";
					}

					if(!(result.length === 3 || result.length === 4)){
						// Skip invalid items
						continue;
					}
					
					if(!mapDataAll.has(website)){
						// Basic information for websites not supported, or not yet
						mapDataAll.set(website, new Map());
					}
					
					if(checkDuplicates){
						let checkDuplicates_result = "";
						mapDataAll.get(website).forEach((value, i, array) => {
							if(i.toLowerCase() === id.toLowerCase()){
								checkDuplicates_result = i;
							}
						});
						if(checkDuplicates_result !== ""){
							consoleMsg("warn", `Found duplicate (${checkDuplicates_result} and ${id})`);
							id = checkDuplicates_result;
						}
					}

					if(!mapDataAll.get(website).has(id)){
						mapDataAll.get(website).set(id, {hide: false, ignore: false, iconIgnore: false, notifyOnline: getPreference("notify_online"), notifyVocalOnline: getPreference("notify_vocal_online"), notifyOffline: getPreference("notify_offline"), notifyVocalOffline: getPreference("notify_vocal_offline"), streamURL: ""});
					}
					
					if(typeof data !== "undefined"){
						if(url.test(data) === true){
							let url_result = url.exec(data);
							mapDataAll.get(website).get(id).streamURL = url_result[1];
							data = data.replace(url_result[0],"");
						}
						
						if(filters.test(data)){
							let filter_id = /(?:(\w+)\:\:)/;
							let scan_string = data;
							while(filter_id.test(scan_string) === true){
								let current_filter_result = scan_string.match(filter_id);
								
								let current_filter_id = current_filter_result[1];
								
								scan_string = scan_string.substring(current_filter_result.index+current_filter_result[0].length, scan_string.length);
								
								let next_filter_result = scan_string.match(filter_id);
								let next_pos = (next_filter_result !== null)? next_filter_result.index : scan_string.length;
								
								let current_data;
								if(next_filter_result !== null){
									current_data = scan_string.substring(current_filter_result.index, next_filter_result.index);
								} else {
									current_data = scan_string.substring(current_filter_result.index, scan_string.length);
								}
								if(cleanEndingSpace.test(current_data)){
									current_data = cleanEndingSpace.exec(current_data)[1];
								}
								
								if(typeof mapDataAll.get(website).get(id)[current_filter_id] === "undefined"){
									mapDataAll.get(website).get(id)[current_filter_id] = [];
								}
								
								if(current_filter_id === "hide" || current_filter_id === "ignore" || current_filter_id === "iconIgnore" || current_filter_id === "notifyOnline" || current_filter_id === "notifyVocalOnline" || current_filter_id === "notifyOffline" || current_filter_id === "notifyVocalOffline"){
									let boolean = getBooleanFromVar(current_data);
									if(typeof boolean === "boolean"){
										current_data = boolean;
									} else {
										consoleMsg("warn", `${current_filter_id} of ${id} should be a boolean`);
									}
									mapDataAll.get(website).get(id)[current_filter_id] = current_data;
								} else if(current_filter_id === "facebook" || current_filter_id === "twitter" || current_filter_id === "vocalStreamName"){
									mapDataAll.get(website).get(id)[current_filter_id] = decodeString(current_data);
								} else {
									if(checkDuplicates){
										let toLowerCase = function(str){return str.toLowerCase();}
										if(mapDataAll.get(website).get(id)[current_filter_id].map(toLowerCase).indexOf(decodeString(current_data).toLowerCase()) === -1){
											mapDataAll.get(website).get(id)[current_filter_id].push(decodeString(current_data));
										} else {
											consoleMsg("warn", `Found duplicate for the setting "${current_filter_id}" from "${id}" (${website}): ${decodeString(current_data)}`);
										}
									} else {
										mapDataAll.get(website).get(id)[current_filter_id].push(decodeString(current_data));
									}
								}
								scan_string = scan_string.substring(next_pos, scan_string.length);
							}
						}
					}
				}
			}
			this.mapDataAll = mapDataAll;
			//this.objDataAll = mapToObj(this.mapDataAll);
			if(typeof requested_website === "string" && requested_website !== ""){
				this.mapData = this.mapDataAll.get(requested_website);
				//this.objData = this.objDataAll[requested_website];
				this.website = requested_website;
			}
		} else {
			this.mapDataAll = mapDataAll;
			//this.objDataAll = mapToObj(this.mapDataAll);
			if(typeof requested_website === "string" && requested_website !== ""){
				this.mapData = this.mapDataAll.get(requested_website);
				//this.objData = this.objDataAll[requested_website];
				this.website = requested_website;
			}
		}
		
		// Update cache
		streamListFromSetting_cache = {
			"stringData": this.stringData,
			"mapDataAll": mapDataAll
		}
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
								filters = filters + " " + j + "::" + encodeString(streamSettings[j][k]);
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
appGlobal["streamListFromSetting"] = streamListFromSetting;

function getStreamURL(website, id, contentId, usePrefUrl){
	let streamList = (new streamListFromSetting(website)).mapData;
	
	if(streamList.has(id)){
		if(streamList.get(id).streamURL != "" && usePrefUrl == true){
			return streamList.get(id).streamURL;
		} else {
			if(liveStatus.get(website).has(id) && liveStatus.get(website).get(id).has(contentId)){
				let streamData = liveStatus.get(website).get(id).get(contentId);
				if(typeof streamData.streamURL === "string" && streamData.streamURL !== ""){
					return streamData.streamURL;
				}
			}
			if(channelInfos.get(website).has(id)){
				if(typeof channelInfos.get(website).get(id).streamURL === "string" && channelInfos.get(website).get(id).streamURL !== ""){
						return channelInfos.get(website).get(id).streamURL
				}
			}
			switch(website){
				case "dailymotion":
					return `http://www.dailymotion.com/video/${id}`;
					break;
				case "smashcast":
					return `http://www.smashcast.tv/${id}`;
					break;
				case "twitch":
					return `http://www.twitch.tv/${id}`;
					break;
				case "mixer":
					return `https://mixer.com/${id}`;
					break;
				case "youtube":
					if(website_channel_id.test(contentId)){
						return `https://youtube.com/channel/${website_channel_id.exec(id)[1]}`;
					} else {
						return `https://www.youtube.com/watch?v=${contentId}`;
						//return `https://youtu.be/${contentId}`;
					}
					break;
				default:
					return null;
			}
		}
	}
}
appGlobal["getStreamURL"] = getStreamURL;

function refreshPanel(data){
	let doUpdateTheme = false;
	if(typeof data !== "undefined"){
		if(typeof data.doUpdateTheme !== "undefined"){
			doUpdateTheme = data.doUpdateTheme;
		}
	}
	updatePanelData(doUpdateTheme);
}
function refreshStreamsFromPanel(){
	let done = ()=>{
		updatePanelData();
	};
	if(appGlobal["checkingLivesFinished"]){
		checkLives()
			.then(done)
			.catch(done)
	}
}

function display_id(id, displayName){
	if(website_channel_id.test(id)){
		return i18ex._("The_channel", {"channel": (typeof displayName === "string")? displayName : website_channel_id.exec(id)[1]});
	} else {
		return i18ex._("The_stream", {"channel": (typeof displayName === "string")? displayName : id});
	}
}
let activeTab;
function addStreamFromPanel(data){
	let current_tab = activeTab;
	let active_tab_url = current_tab.url;
	
	let http_url = /^(?:http|https):\/\//;
	if(!http_url.test(active_tab_url)){
		consoleMsg("info", "Current tab isn't a http/https url");
		return false;
	}
	let active_tab_title = current_tab.title;
	let type;
	let url_list;

	if(typeof data === "object"){
		consoleDir(data);
		if(data.hasOwnProperty("ContextMenu_URL")){
			url_list = [data.ContextMenu_URL];
			type = "ContextMenu";
		} else if(data.hasOwnProperty("url")){
			url_list = [data.url];
			type = "url";
		} else if(data.hasOwnProperty("embed_list")){
			consoleMsg("log", "[Live notifier] AddStream - Embed list");
			url_list = data.embed_list;
			type = "embed";
		}
	} else {
		consoleMsg("info", "Current active tab: " + active_tab_url);
		url_list = [active_tab_url];
	}
	let pattern_found = false;
	for(let url of url_list){
		websites.forEach((websiteAPI, website) => {
			websiteAPI.addStream_URLpatterns.forEach((patterns, source_website) => {
				let streamListSetting = new streamListFromSetting(website);
				patterns.forEach(pattern => {
					let id = "";
					if(pattern.test(url) && !pattern_found){
						pattern_found = true;
						id = pattern.exec(url)[1];
						if(streamListSetting.streamExist(website, id)){
							doNotif({
								"message": `${display_id(id)} ${i18ex._("is_already_configured")}`
							})
								.catch(err=>{
									consoleMsg("warn", err);
								})
							;
							return true;
						} else {
							let current_API = websiteAPI.API_addStream(source_website, id);
							
							let addStream_RequestOptions = {
								url: current_API.url,
								overrideMimeType: current_API.overrideMimeType,
								onComplete: function (response) {
									let data = response.json;
									
									consoleDir(data, `${website} - ${response.url}`);
									
									let responseValidity = checkResponseValidity(website, response);
									
									let {streamId, streamName} = websiteAPI.addStream_getId(source_website, id, response, streamListSetting, responseValidity);
									
									if(website === "dailymotion" && responseValidity === "invalid_parameter"){
										doNotif({
											"message": i18ex._("No_supported_stream_detected_in_the_current_tab_so_nothing_to_add")
										})
											.catch(err=>{
												consoleMsg("warn", err);
											})
										;
										return null;
									} else if(streamId === null){
										doNotif({
											"message": `${display_id(id)} ${i18ex._("wasnt_configured_but_error_retrieving_data")}`
										})
											.catch(err=>{
												consoleMsg("warn", err);
											})
										;
										return null;
									} else if(typeof streamId === "boolean" && streamId === true){
										doNotif({
											"message": `${display_id(id)} ${i18ex._("is_already_configured")}`
										})
											.catch(err=>{
												consoleMsg("warn", err);
											})
										;
										return true;
									} else if(typeof streamId === "object" && streamId.hasOwnProperty("url")){
										addStreamFromPanel(streamId);
										return true;
									}
									
									if(streamListSetting.streamExist(website, streamId)){
										const streamSettings = streamListSetting.mapDataAll.get(website).get(streamId);
										if(streamSettings.hide === false && streamSettings.ignore === false){
											doNotif({
												"message": `${display_id(streamId, streamName)} ${i18ex._("is_already_configured")}`
											})
												.catch(err=>{
													consoleMsg("warn", err);
												})
											;
										} else {
											if(getPreference("confirm_addStreamFromPanel")){
												doNotif({
													"message": `${display_id(streamId, streamName)} ${i18ex._("hidden_ignored_reactivate")}`,
													"buttons": [notifButtons.yes, notifButtons.no]
												}, true)
													.then(()=>{
														const streamListSetting = new streamListFromSetting(website),
															streamSettings = streamListSetting.mapData.get(streamId);
														streamSettings.hide = false;
														streamSettings.ignore = false;
														streamListSetting.update();
													})
													.catch(err=>{
														consoleMsg("warn", err);
													})
												;
											} else {
												streamSettings.hide = false;
												streamSettings.ignore = false;
												streamListSetting.update();
												doNotif({
													"message": `${display_id(streamId, streamName)} ${i18ex._("hidden_ignored_reactivated")}`
												})
													.catch(err=>{
														consoleMsg("warn", err);
													})
												;
											}
										}
									} else {
										if(getPreference("confirm_addStreamFromPanel")){
											doNotif({
												"message": `${display_id(streamId, streamName)} ${i18ex._("wasnt_configured_and_can_be_added")}`,
												"buttons": [notifButtons.addItem, notifButtons.cancel]
											}, true)
												.then(()=>{
													const streamListSetting = new streamListFromSetting(website);
													let url = (type === "embed")? active_tab_url : "";

													streamListSetting.addStream(website, streamId, url);
													streamListSetting.update();
													// Update the panel for the new stream added
													setTimeout(function(){
														refreshPanel(false);
													}, 5000);
												})
												.catch(err=>{
													consoleMsg("warn", err);
												})
											;
										} else {
											streamListSetting.addStream(website, streamId, ((type === "embed")? active_tab_url : ""));
											streamListSetting.update();
											doNotif({
												"message": `${display_id(streamId, streamName)} ${i18ex._("wasnt_configured_and_have_been_added")}`
											})
												.catch(err=>{
													consoleMsg("warn", err);
												})
											;

											// Update the panel for the new stream added
											setTimeout(function(){
												refreshPanel(false);
											}, 5000);
										}
									}
								}
							};
							if(current_API.hasOwnProperty("headers") === true){
								addStream_RequestOptions.headers = current_API.headers;
							}
							if(current_API.hasOwnProperty("content") === true){
								addStream_RequestOptions.content = current_API.content;
							}
							if(current_API.hasOwnProperty("contentType") === true){
								addStream_RequestOptions.contentType = current_API.contentType;
							}
							if(current_API.hasOwnProperty("Request_documentParseToJSON") === true){
								addStream_RequestOptions.Request_documentParseToJSON = current_API.Request_documentParseToJSON;
							}
							if(current_API.hasOwnProperty("customJSONParse") === true){
								addStream_RequestOptions.customJSONParse = current_API.customJSONParse;
							}
							Request(addStream_RequestOptions).get();
							return true;
						}
					}
				})
			})
		})
	}
	if(pattern_found){
		return true;
	}
	if(typeof data !== "object" && type !== "ContextMenu" && type !== "url"){
		if(!data.hasOwnProperty("embed_list")){
			browser.tabs.executeScript(current_tab.id, {file: "/data/js/page_getEmbedList.js"});
		}
	} else {
		doNotif({
			"message": i18ex._("No_supported_stream_detected_in_the_current_tab_so_nothing_to_add")
		})
			.catch(err=>{
				consoleMsg("warn", err);
			})
		;
	}
}
function deleteStreamFromPanel(data){
	let streamListSetting = new streamListFromSetting(data.website);
	let id = data.id;
	let website = data.website;
	if(streamListSetting.streamExist(website, id)){
		if(getPreference("confirm_deleteStreamFromPanel")){
			doNotif({
				"message": `${display_id(id)} ${i18ex._("will_be_deleted_are_you_sure")}`,
				"buttons": [notifButtons.deleteItem, notifButtons.cancel]
			}, true)
				.then(()=>{
					const streamListSetting = new streamListFromSetting(website);
					streamListSetting.deleteStream(website, id);
					streamListSetting.update();
					doNotif({
						"message": `${display_id(id)} ${i18ex._("has_been_deleted")}`
					})
						.catch(err=>{
							consoleMsg("warn", err);
						})
					;
					// Update the panel for the new stream added
					refreshPanel(false);
				})
				.catch(err=>{
					consoleMsg("warn", err);
				})
			;
		} else {
			streamListSetting.deleteStream(website, id);
			streamListSetting.update();
			doNotif({
				"message": `${display_id(id)} ${i18ex._("has_been_deleted")}`
			})
				.catch(err=>{
					consoleMsg("warn", err);
				})
			;
			// Update the panel for the new stream added
			refreshPanel(false);
		}
	}
}

function shareStream(data){
	let website = data.website;
	let id = data.id;
	let contentId = data.contentId;
	
	let streamList = (new streamListFromSetting(website)).mapData;
	
	let streamData = liveStatus.get(website).get(id).get(contentId);
	let streamName = streamData.streamName;
	let streamURL = getStreamURL(website, id, contentId, true);
	let streamStatus = streamData.streamStatus;
	
	// let facebookID = (typeof streamList.get(id).facebook === "string" && streamList.get(id).facebook !== "")? streamList.get(id).facebook : streamData.twitterID;
	let twitterID = (typeof streamList.get(id).twitter === "string" && streamList.get(id).twitter !== "")? streamList.get(id).twitter : streamData.twitterID;
	
	let streamerAlias = streamName;
	/*
	if(facebookID != null && facebookID != ""){
		
	}*/
	let reg_testTwitterId= /\s*@(.+)/;
	if(twitterID !== null && twitterID !== ""){
		streamerAlias = ((reg_testTwitterId.test(twitterID))? "" : "@") + twitterID;
		consoleMsg("info", `${id}/${contentId} (${website}) twitter ID: ${twitterID}`);
	}
	
	let shareMessage = `${i18ex._("I_am_watching_the_stream_of")} ${streamerAlias}, "${streamStatus}"`;
	
	//let url = `https:\/\/twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamURL}&hashtags=LiveNotifier${(twitterID != "")? `&related=${twitterID}` : ""}`;
	let url = `https:\/\/twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamURL}${(twitterID !== "")? `&related=${twitterID}` : ""}&via=LiveNotifier`;
	browser.tabs.create({ "url": url })
		.catch(err=>{
			if(err){consoleMsg("error", err)}
		});
}

function streamSetting_Update(data){
	let website = data.website;
	let id = data.id;
	let contentId = data.contentId;
	
	let streamSettingsData = data.streamSettingsData;
	
	let streamListSetting = new streamListFromSetting(website);
	let streamList = streamListSetting.mapData;
	
	for(let i in streamSettingsData){
		if(streamSettingsData.hasOwnProperty(i)){ // Make sure to not loop constructors
			streamList.get(id)[i] = streamSettingsData[i];
		}
	}
	streamListSetting.update();
}

appGlobal.sendDataToMain = function(sender, id, data){
	if(sender === "Live_Notifier_Panel" || sender === "Live_Notifier_Embed" || sender === "Live_Notifier_Options"){
		switch(id){
			case "refreshPanel":
				refreshPanel(data);
				break;
			case "importStreams":
				let website = data;
				consoleMsg("info", `Importing ${website}...`);
				importButton(website);
				break;
			case "refreshStreams":
				refreshStreamsFromPanel();
				break;
			case "addStream":
				// Make sure to have up-to-date active tab AND its url
				browser.tabs.query({active: true, lastFocusedWindow: true})
					.then((tabs)=>{
						activeTab = tabs[0];
						addStreamFromPanel(data);
					})
				;
				break;
			case "deleteStream":
				deleteStreamFromPanel(data);
				break;
			case "openTab":
				openTabIfNotExist(data);
				break;
			case "panel_onload":
				handleChange(data);
				break;
			case "shareStream":
				shareStream(data);
				break;
			case "streamSetting_Update":
				streamSetting_Update(data);
				break;
			default:
				consoleMsg("warn", `Unkown message id (${id})`);
		}
	} else if(sender === "Live_Streamer_Embed"){
		switch(id){
			case "addStream":
				addStreamFromPanel(data);
				break;
		}
	} else {
		consoleMsg("warn", "Unknown sender");
	}
};

chrome.runtime.onMessage.addListener(message=>{
	appGlobal.sendDataToMain(message.sender, message.id, message.data);
});

function updatePanelData(doUpdateTheme=true){
	// Update panel data
	if(typeof panel__UpdateData === "function"){
		panel__UpdateData(doUpdateTheme);
	}
}

function handleChange() {
	setIcon();
	updatePanelData();
}

function openTabIfNotExist(url){
	consoleMsg("log", url);
	browser.tabs.query({})
		.then(tabs=>{
			let custom_url = url.toLowerCase().replace(/http(?:s)?:\/\/(?:www\.)?/i,"");
			for(let tab of tabs){
				if(tab.url.toLowerCase().indexOf(custom_url) !== -1){ // Mean the url was already opened in a tab
					browser.tabs.highlight({tabs: tab.index}); // Show the already opened tab
					return true; // Return true to stop the function as the tab is already opened
				}
			}
			// If the function is still running, it mean that the url isn't detected to be opened, so, we can open it
			browser.tabs.create({ "url": url });
			return false; // Return false because the url wasn't already in a tab
		})
		.catch(err=>{
			if(err) consoleMsg("warn", err);
		});
}

const chromeNotifications = new ChromeNotificationControler(),
	notifButtons = {
		"openUrl": {title: i18ex._("Open_in_browser"), iconUrl: "/data/images/ic_open_in_browser_black_24px.svg"},
		"close": {title: i18ex._("Close"), iconUrl: "/data/images/ic_close_black_24px.svg"},
		"addItem": {title: i18ex._("Add"), iconUrl: "/data/images/ic_add_circle_black_24px.svg"},
		"deleteItem": {title: i18ex._("Delete"), iconUrl: "/data/images/ic_delete_black_24px.svg"},
		"cancel": {title: i18ex._("Cancel"), iconUrl: "/data/images/ic_cancel_black_24px.svg"},
		"yes": {title: i18ex._("Yes"), iconUrl: "/data/images/ic_add_circle_black_24px.svg"},
		"no": {title: i18ex._("No"), iconUrl: "/data/images/ic_cancel_black_24px.svg"}
	};
function doNotif(options, suffixConfirmIfNoButtons=false){
	return new Promise((resolve, reject)=>{
		if(typeof options !== "object" || options === null){
			reject("Missing argument");
			return null;
		}
		if(!options.title || typeof options.title !== "string" || options.title === ""){
			options.title = "Live notifier";
		}
		if(!options.iconUrl || typeof options.iconUrl !== "string" || options.iconUrl === ""){
			options.iconUrl = myIconURL;
		}

		if(suffixConfirmIfNoButtons === true){
			options.title = `${options.title} (${i18ex._("click_to_confirm")})`;
		} else if(chromeNotifications.chromeAPI_button_availability === true && (!options.buttons || !Array.isArray(options.buttons))){ // 2 buttons max per notification, the 2nd button is used as a cancel (no action) button in Live Notifier
			options.buttons = [notifButtons.close];
		}

		chromeNotifications.send(options)
			.then(result=>{
				const {triggeredType, notificationId, buttonIndex} = result;
				consoleMsg("info", `${notificationId}: ${triggeredType}${(buttonIndex && buttonIndex !==null)? ` (Button index: ${buttonIndex})`:""}`);

				// 0 is the first button, used as button of action
				if((buttonIndex===null || buttonIndex===0)){
					resolve(result);
				} else {
					reject(result);
				}
			})
			.catch(err=>{
				/*if(err){
					consoleMsg("warn", err);
				}*/
				reject(err);
			})
		;
	});
}
appGlobal["doNotif"] = doNotif;

function getCleanedStreamStatus(website, id, contentId, streamSetting, isStreamOnline){
	let getStringsCountInArray = function(someArray){
		let count = 0;
		for(let i in someArray){
			if(!someArray.hasOwnProperty(i)){ // Make sure to not loop constructors
				continue;
			}
			if(typeof someArray[i] === "string"){
				count++;
			}
		}
		return count;
	};
	let streamData = liveStatus.get(website).get(id).get(contentId);
	if(streamData.streamStatus !== ""){
		let lowerCase_status = (streamData.streamStatus).toLowerCase();
		if(isStreamOnline){
			let whitelisted = false;
			
			if(getStringsCountInArray(streamSetting.statusWhitelist) > 0){
				let statusWhitelist = streamSetting.statusWhitelist;
				for(let i in statusWhitelist){
					if(statusWhitelist.hasOwnProperty(i) && statusWhitelist[i] !== null && lowerCase_status.indexOf(statusWhitelist[i].toLowerCase()) !== -1){
						whitelisted = true;
						break;
					}
				}
			}
			if(getPreference("statusWhitelist") !== ""){
				let statusWhitelist_List = getFilterListFromPreference(getPreference("statusWhitelist"));
				for(let i in statusWhitelist_List){
					if(statusWhitelist_List.hasOwnProperty(i) && statusWhitelist_List[i] !== null && lowerCase_status.indexOf(statusWhitelist_List[i].toLowerCase()) !== -1){
						whitelisted = true;
						break;
					}
				}
			}
			if((getStringsCountInArray(streamSetting.statusWhitelist) > 0 || getPreference("statusWhitelist") !== "") && whitelisted === false){
				isStreamOnline = false;
				consoleMsg("info", `${id} current status does not contain whitelist element(s)`);
			}
			
			let blacklisted = false;
			
			if(getStringsCountInArray(streamSetting.statusBlacklist) > 0){
				let statusBlacklist = streamSetting.statusBlacklist;
				for(let i in statusBlacklist){
					if(statusBlacklist.hasOwnProperty(i) && statusBlacklist[i] !== null && lowerCase_status.indexOf(statusBlacklist[i].toLowerCase()) !== -1){
						blacklisted = true;
					}
				}
			}
			if(getPreference("statusBlacklist") !== ""){
				let statusBlacklist_List = getFilterListFromPreference(getPreference("statusBlacklist"));
				for(let i in statusBlacklist_List){
					if(statusBlacklist_List.hasOwnProperty(i) && statusBlacklist_List[i] !== null && lowerCase_status.indexOf(statusBlacklist_List[i].toLowerCase()) !== -1){
						blacklisted = true;
						break;
					}
				}
			}
			if((getStringsCountInArray(streamSetting.statusBlacklist) > 0 || getPreference("statusBlacklist") !== "") && blacklisted === true){
				isStreamOnline = false;
				consoleMsg("info", `${id} current status contain blacklist element(s)`);
			}
		}
	}
	if(typeof streamData.streamGame === "string" && streamData.streamGame !== ""){
		let lowerCase_streamGame = (streamData.streamGame).toLowerCase();
		if(isStreamOnline){
			let whitelisted = false;
			if(getStringsCountInArray(streamSetting.gameWhitelist) > 0){
				let gameWhitelist = streamSetting.gameWhitelist;
				for(let i in gameWhitelist){
					if(gameWhitelist.hasOwnProperty(i) && gameWhitelist[i] !== null && lowerCase_streamGame.indexOf(gameWhitelist[i].toLowerCase()) !== -1){
						whitelisted = true;
						break;
					}
				}
			}
			if(getPreference("gameWhitelist") !== ""){
				let gameWhitelist_List = getFilterListFromPreference(getPreference("gameWhitelist"));
				for(let i in gameWhitelist_List){
					if(gameWhitelist_List.hasOwnProperty(i) && gameWhitelist_List[i] !== null && lowerCase_streamGame.indexOf(gameWhitelist_List[i].toLowerCase()) !== -1){
						whitelisted = true;
						break;
					}
				}
			}
			if((getStringsCountInArray(streamSetting.gameWhitelist) > 0 || getPreference("gameWhitelist") !== "") && whitelisted === false){
				isStreamOnline = false;
				consoleMsg("info", `${id} current game does not contain whitelist element(s)`);
			}
			
			let blacklisted = false;
			if(getStringsCountInArray(streamSetting.gameBlacklist) > 0){
				let gameBlacklist = streamSetting.gameBlacklist;
				for(let i in gameBlacklist){
					if(gameBlacklist.hasOwnProperty(i) && gameBlacklist[i] !== null && lowerCase_streamGame.indexOf(gameBlacklist[i].toLowerCase()) !== -1){
						blacklisted = true;
					}
				}
			}
			if(getPreference("gameBlacklist") !== ""){
				let gameBlacklist_List = getFilterListFromPreference(getPreference("gameBlacklist"));
				for(let i in gameBlacklist_List){
					if(gameBlacklist_List.hasOwnProperty(i) && gameBlacklist_List[i] !== null && lowerCase_streamGame.indexOf(gameBlacklist_List[i].toLowerCase()) !== -1){
						blacklisted = true;
						break;
					}
				}
			}
			if((getStringsCountInArray(streamSetting.gameBlacklist) > 0 || getPreference("gameBlacklist") !== "") && blacklisted === true){
				isStreamOnline = false;
				consoleMsg("info", `${id} current game contain blacklist element(s)`);
			}
		}
		
	}
	streamData.liveStatus.filteredStatus = isStreamOnline;
	return isStreamOnline;
}
appGlobal["getCleanedStreamStatus"] = getCleanedStreamStatus;

appGlobal["notificationGlobalyDisabled"] = false;
function doStreamNotif(website, id, contentId, streamSetting){
	let streamList = (new streamListFromSetting(website)).mapData;
	let streamData = liveStatus.get(website).get(id).get(contentId);
	
	let channelData = (channelInfos.has(website) && channelInfos.get(website).has(id))? channelInfos.get(website).get(id) : null;

	let online = streamData.liveStatus.API_Status;
	
	let streamName = streamData.streamName;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	//let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamLogo = "";

	if(typeof streamOwnerLogo === "string" && streamOwnerLogo !== ""){
		streamLogo  = streamOwnerLogo;
	}

	let isStreamOnline_filtered = getCleanedStreamStatus(website, id, contentId, streamSetting, online);
	
	if(appGlobal["notificationGlobalyDisabled"] === true){
		return null;
	}

	if(isStreamOnline_filtered){
		if(streamData.liveStatus.notifiedStatus === false){
			if((typeof streamList.get(id).notifyOnline === "boolean")? streamList.get(id).notifyOnline : getPreference("notify_online") === true){
				let streamStatus = ((streamData.streamStatus !== "")? ": " + streamData.streamStatus : "") + ((streamData.streamGame !== "")? (" (" + streamData.streamGame + ")") : "");
				let notifOptions = {
					"title": i18ex._("Stream_online"),
					"message": `${streamName}${streamStatus}`,
					"buttons": [notifButtons.openUrl, notifButtons.close]
				};
				if(streamLogo !== ""){
					notifOptions.iconUrl = streamLogo;
				}

				doNotif(notifOptions)
					.then(result=>{
						openTabIfNotExist(getStreamURL(website, id, contentId, true));
					})
					.catch(err=>{
						consoleMsg("warn", err);
					})
				;
			}
			streamData.liveStatus.notifiedStatus = isStreamOnline_filtered;
			
			if(typeof speechSynthesis === "object"
				&& ((channelData===null && streamData.liveStatus.notifiedStatus_Vocal === false)
					|| (channelData!==null && channelData.liveStatus.notifiedStatus_Vocal === false)
				) && ((typeof streamList.get(id).notifyVocalOnline === "boolean")? streamList.get(id).notifyVocalOnline : getPreference("notify_vocal_online")) === true
			){
				voiceReadMessage(i18ex._("language"), `${(typeof streamList.get(id).vocalStreamName === "string")? streamList.get(id).vocalStreamName : streamName} ${i18ex._("is_online")}`);
				if(channelData!==null){
					channelData.liveStatus.notifiedStatus_Vocal = isStreamOnline_filtered;
				} else {
					streamData.liveStatus.notifiedStatus_Vocal = isStreamOnline_filtered;
				}
			}
		}
	} else {
		if(streamData.liveStatus.notifiedStatus === true){
			if((typeof streamList.get(id).notifyOffline === "boolean")? streamList.get(id).notifyOffline : getPreference("notify_offline") === true){
				if(streamLogo !== ""){
					doNotif({
						"title": i18ex._("Stream_offline"),
						"message": streamName,
						"iconUrl": streamLogo
					})
						.catch(err=>{
							consoleMsg("warn", err);
						})
					;
				} else {
					doNotif({
						"title": i18ex._("Stream_offline"),
						"message": streamName
					})
						.catch(err=>{
							consoleMsg("warn", err);
						})
					;
				}
			}
			streamData.liveStatus.notifiedStatus = isStreamOnline_filtered;
			
			if(typeof speechSynthesis === "object"
				&& ((channelData===null && streamData.liveStatus.notifiedStatus_Vocal===true)
					|| (channelData!==null && channelData.liveStatus.notifiedStatus_Vocal===true)
				) && ((typeof streamList.get(id).notifyVocalOffline === "boolean")? streamList.get(id).notifyVocalOffline : getPreference("notify_vocal_offline")) === true
			){
				voiceReadMessage(i18ex._("language"), `${(typeof streamList.get(id).vocalStreamName === "string")? streamList.get(id).vocalStreamName : streamName} ${i18ex._("is_offline")}`);
				if(channelData!==null){
					channelData.liveStatus.notifiedStatus_Vocal = isStreamOnline_filtered;
				} else {
					streamData.liveStatus.notifiedStatus_Vocal = isStreamOnline_filtered;
				}
			}
		}
	}
	streamData.liveStatus.notifiedStatus = isStreamOnline_filtered;
}
appGlobal["doStreamNotif"] = doStreamNotif;

function getOfflineCount(){
	let offlineCount = 0;
	
	let streamListSetting = (new streamListFromSetting()).mapDataAll;
	websites.forEach((websiteAPI, website) => {
		streamListSetting.get(website).forEach((streamList, id) => {
			if(typeof streamList.ignore === "boolean" && streamList.ignore === true){
				// Ignoring stream with ignore set to true from online count
				//consoleMsg("log", `[Live notifier - getOfflineCount] ${id} of ${website} is ignored`);
				return;
			}
			
			if(liveStatus.get(website).has(id)){
				if(liveStatus.get(website).get(id).size === 0){
					offlineCount++;
				} else {
					liveStatus.get(website).get(id).forEach(streamData=>{
						if(!streamData.liveStatus.filteredStatus){
							offlineCount++;
						}
					})
				}
			}
		})
	});
	return offlineCount;
}
appGlobal["getOfflineCount"] = getOfflineCount;

//Changement de l'icone
function setIcon(){
	appGlobal["onlineCount"] = 0;
	let badgeOnlineCount = 0;
	
	liveStatus.forEach((website_liveStatus, website) => {
		let streamList = (new streamListFromSetting(website)).mapData;
		website_liveStatus.forEach((id_liveStatus, id) => {
			if(streamList.has(id) && (typeof streamList.get(id).ignore === "boolean" && streamList.get(id).ignore === true)){
				// Ignoring stream with ignore set to true from online count
				//consoleMsg("log", `[Live notifier - setIcon] ${id} of ${website} is ignored`);
				//return;
			} else {
				id_liveStatus.forEach((streamData, contentId, array) => {
					if(streamData.liveStatus.filteredStatus && streamList.has(id)){
						appGlobal["onlineCount"] = appGlobal["onlineCount"] + 1;
						if(streamList.has(id) && !(typeof streamList.get(id).iconIgnore === "boolean" && streamList.get(id).iconIgnore === true)){
							badgeOnlineCount++;
						}
					}
				})
			}
		})
	});
	
	if(badgeOnlineCount > 0){
		browser.browserAction.setTitle({title: i18ex._("count_stream_online", {"count": badgeOnlineCount})});
	} else {
		browser.browserAction.setTitle({title: i18ex._("No_stream_online")});
	}
	
	let badgeImage = (badgeOnlineCount > 0)? online_badgeData : offline_badgeData;
	if(badgeImage !== null){
		browser.browserAction.setIcon({
			imageData: badgeImage
		});
	} else {
		consoleMsg("warn", "Icon(s) is/are not loaded");
	}
	
	browser.browserAction.setBadgeText({text: badgeOnlineCount.toString()});
	browser.browserAction.setBadgeBackgroundColor({color: (badgeOnlineCount > 0)? "#FF0000" : "#424242"});
}
appGlobal["setIcon"] = setIcon;

let website_channel_id = /channel\:\:(.*)/;
appGlobal["website_channel_id"] = website_channel_id;
let facebookID_from_url = /(?:http|https):\/\/(?:www\.)?facebook.com\/([^\/]+)(?:\/.*)?/;
let twitterID_from_url = /(?:http|https):\/\/(?:www\.)?twitter.com\/([^\/]+)(?:\/.*)?/;

function checkResponseValidity(website, response){
	let data = response.json;
	
	if(data === null || typeof data !== "object" || JSON.stringify(data) === "{}"){ // Empty or invalid JSON
		if(typeof response === "object" && response.hasOwnProperty("status") && typeof response.status === "number" && (/^4\d*$/.test(response.status) === true || /^5\d*$/.test(response.status) === true)){
			// Request Error
			consoleMsg("warn", "Unable to get stream state (request error).");
			return "request_error";
		} else {
			if(typeof response === "object" && response.hasOwnProperty("status") && typeof response.status === "number" && response.status === 0){
				consoleMsg("warn", "Unable to get stream state (timeout).");
				return "timout";
			} else {
				// Parse Error
				consoleMsg("warn", "Unable to get stream state (response is empty or not valid JSON).");
				return "parse_error";
			}
		}
	}
	let state = websites.get(website).checkResponseValidity(data);
	switch(state){
		case "error":
			consoleMsg("warn", `[${website}] Unable to get stream state (error detected).`);
			return "error";
			break;
		case "vod":
			consoleMsg("warn", `[${website}] Unable to get stream state (vod detected).`);
			return "vod";
			break;
		case "notstream":
			consoleMsg("warn", `[${website}] Unable to get stream state (not a stream).`);
			return "notstream";
			break;
		case "":
		case "success":
			return "success";
		default:
			consoleMsg("warn", `[${website}] Unable to get stream state (${state}).`);
			console.log(response.url);
			return state;
			break;
	}
}


function convertMS(ms) { // From https://gist.github.com/remino/1563878 with the ms rest added
	let d, h, m, s, new_ms;
	s = Math.floor(ms / 1000);
	new_ms = Math.floor((ms % 1000) * 1000) / 1000;
	m = Math.floor(s / 60);
	s = s % 60;
	h = Math.floor(m / 60);
	m = m % 60;
	d = Math.floor(h / 24);
	h = h % 24;
	return { d: d, h: h, m: m, s: s, ms: new_ms };
}
let timingMarks = new Map();
function timing(id){
	timingMarks.set(id, performance.now());
}
function timingEnd(id){
	if(timingMarks.has(id)){
		let duration = performance.now() - timingMarks.get(id);
		timingMarks.delete(id);
		let extracted = convertMS(duration);
		return {
			"raw": duration,
			"timing": `${(extracted.d !== 0)? `${extracted.d}d` : ""}${(extracted.h !== 0)? `${extracted.h}h` : ""}${(extracted.m !== 0)? `${extracted.m}m` : ""}${(extracted.s !== 0)? `${extracted.s}s` : ""}${extracted.ms}ms`
		}
	} else {
		throw `${id} not started`;
	}
}
function getBase64Picture(pictureNode){
	// Return base64 picture node loaded, and return a promise if not
	let loadImageData = function(){
		let canvas = document.createElement("canvas");
		canvas.width = pictureNode.naturalWidth;
		canvas.height = pictureNode.naturalHeight;
		
		let ctx = canvas.getContext("2d");
		ctx.drawImage(pictureNode, 0, 0);
		
		return canvas.toDataURL();
	};
	if(pictureNode.complete === true){
		return loadImageData();
	} else {
		return new Promise(function(resolve, reject){
			pictureNode.onload = function(){
				resolve(loadImageData());
			}
		})
	}
}

let DATAs, streamsTimings, needCheckMissing = false;
appGlobal["checkingLivesFinished"] = true;
function checkLives(idArray){
	return new Promise(function(resolve, reject){
		let promises = new Map();
		
		DATAs = new Map();
		streamsTimings = new Map();
		appGlobal["checkingLivesFinished"] = false;
		timing("checkLives");
		
		let streamListSetting = new streamListFromSetting();
		
		let listToCheck;
		if(typeof idArray !== "undefined" && idArray instanceof Map){
			listToCheck = idArray;
		} else {
			listToCheck = streamListSetting.mapDataAll;
			consoleDir(mapToObj(streamListSetting.mapDataAll), "[Live Notifier] Checking lives...");
		}
		
		let checkQueue = new Queue(getPreference("check_limit"));
		
		websites.forEach((websiteAPI, website) => {
			if(listToCheck.has(website)){
				listToCheck.get(website).forEach((streamList, id) => {
					if(typeof streamList.ignore === "boolean" && streamList.ignore === true){
						//consoleMsg("info", `Ignoring ${id}`);
						return;
					}
					
					checkQueue.enqueue(getPrimary, `${website}::${id}`, id, "", website, streamList);
				})
			}
		});
		
		let onStreamCheckBegin = function(queueId, args){
			let id = args[0],
				contentId = args[1],
				website = args[2],
				streamSetting = args[3];
			
			timing(`${website}::${id}`);
		};
		let onStreamCheckEnd = function(queueId, promiseResult, args){
			let id = args[0],
				contentId = args[1],
				website = args[2],
				streamSetting = args[3];
			
			let streamList = listToCheck.get(website).get(id);
			
			streamsTimings.set(`${website}::${id}`, timingEnd(`${website}::${id}`).timing);
			if((typeof promiseResult === "string" && promiseResult.indexOf("StreamChecked") !== -1) || (typeof promiseResult === "object" && JSON.stringify(promiseResult).indexOf("StreamChecked") !== -1)){
				liveStatus.get(website).get(id).forEach((value, contentId, array) => {
					if((typeof promiseResult === "string" && promiseResult.indexOf("StreamChecked") !== -1) || (typeof promiseResult === "object" && typeof promiseResult[contentId] === "string" && promiseResult[contentId].indexOf("StreamChecked") !== -1)){
						doStreamNotif(website, id, contentId, streamList);
					}
				})
			}
			if(channelInfos.has(website) && channelInfos.get(website).has(id)){
				channelListEnd(website, id, streamListSetting.mapDataAll.get(website).get(id));
			}
			setIcon();
		};
		
		let onCheckEnd = function(result){
			if(getPreference("showAdvanced") && getPreference("showExperimented")){
				console.group();
				consoleMsg("info", `[Live notifier] Live check end`);
				
				consoleDir(result, `Promises result:`);
				
				if(typeof performance.clearResourceTimings === "function"){
					performance.clearResourceTimings();
				}
				consoleMsg("info", "checkLives: " + timingEnd("checkLives").timing);
				consoleDir(streamsTimings, `Timings:`);
				
				consoleDir(mapToObj(DATAs), `DATAs:`);
				
				console.groupEnd();
			}
			
			appGlobal["checkingLivesFinished"] = true;
			resolve(result);
			
			if(!(typeof idArray !== "undefined" && idArray instanceof Map)){ // Only reset interval if it's a "full" check
				clearInterval(interval);
				interval = setInterval(checkLives, getPreference('check_delay') * 60000);
			}
			
			if(needCheckMissing){
				checkMissing();
			}
		};
		
		if(checkQueue.queue.size === 0){
			setIcon();
			appGlobal["checkingLivesFinished"] = true;
		} else {
			checkQueue.run(onStreamCheckBegin, onStreamCheckEnd)
				.then(onCheckEnd)
				.catch(onCheckEnd)
		}
		
		if(!(typeof idArray !== "undefined" && idArray instanceof Map)){ // Only reset interval if it's a "full" check
			clearInterval(interval);
			interval = setInterval(checkLives, getPreference('check_delay') * 60000);
		}

	})
}
function checkMissing(){
	if(appGlobal["checkingLivesFinished"]){
		let listToCheck = new Map();
		let streamListSetting = new streamListFromSetting().mapDataAll;
		websites.forEach((websiteAPI, website) => {
			streamListSetting.get(website).forEach((streamList, id) => {
				if(typeof streamList.ignore === "boolean" && streamList.ignore === true){
					return;
				}
				if(!(liveStatus.get(website).has(id))){
					consoleMsg("info", `${id} from ${website} is not checked yet`);
					
					if(!listToCheck.has(website)){
						listToCheck.set(website, new Map())
					}
					listToCheck.get(website).set(id, streamList);
				}
			})
		});
		
		if(listToCheck.size > 0){
			let refresh = function(result){
				if(typeof panelUpdateData === "function"){
					panelUpdateData();
				}
			};
			checkLives(listToCheck)
				.then(refresh)
				.catch(refresh)
		}
	} else {
		needCheckMissing = true;
	}
}
appGlobal["checkMissing"] = checkMissing;

function getPrimary(id, contentId, website, streamSetting, nextPageToken){
	return new Promise(function(resolve, reject){
		let current_API = websites.get(website).API((typeof contentId === "string" && contentId !== "")? contentId :  id, (typeof nextPageToken === "undefined" || nextPageToken === null)? null : nextPageToken);
		
		let getPrimary_RequestOptions = {
			url: current_API.url,
			overrideMimeType: current_API.overrideMimeType,
			onComplete: function (response) {
				let data = response.json;
				
				if(!DATAs.has(`${website}/${id}`)){
					DATAs.set(`${website}/${id}`, new Map());
				}
				if(typeof contentId === "string" && contentId !== ""){
					if(!DATAs.get(`${website}/${id}`).has(contentId)){
						DATAs.get(`${website}/${id}`).set(contentId, new Map());
					}
					DATAs.get(`${website}/${id}`).get(contentId).set("getPrimary", {"url": response.url, "data": data});
				} else {
					DATAs.get(`${website}/${id}`).set("getPrimary", {"url": response.url, "data": data});
				}
				
				if(!liveStatus.get(website).has(id)){
					liveStatus.get(website).set(id, new Map());
				}
				
				if(!(typeof contentId === "string" && contentId !== "") && website_channel_id.test(id) === true){
					if(typeof nextPageToken !== "undefined" && nextPageToken !== null){
						processChannelList(id, website, streamSetting, response, nextPageToken)
							.then(resolve)
							.catch(reject)
					} else {
						getChannelInfo(website, id)
							.then(function(){
								processChannelList(id, website, streamSetting, response)
									.then(resolve)
									.catch(reject)
							})
							.catch(reject)
					}
				} else {
					if(!(typeof contentId === "string" && contentId !== "")){
						contentId = id;
					}
					
					processPrimary(id, contentId, website, streamSetting, response)
						.then(resolve)
						.catch(reject)
				}
			}
		};
		
		if(current_API.hasOwnProperty("headers") === true){
			getPrimary_RequestOptions.headers = current_API.headers;
		}
		if(current_API.hasOwnProperty("content") === true){
			getPrimary_RequestOptions.content = current_API.content;
		}
		if(current_API.hasOwnProperty("contentType") === true){
			getPrimary_RequestOptions.contentType = current_API.contentType;
		}
		if(current_API.hasOwnProperty("Request_documentParseToJSON") === true){
			getPrimary_RequestOptions.Request_documentParseToJSON = current_API.Request_documentParseToJSON;
		}
		if(current_API.hasOwnProperty("customJSONParse") === true){
			getPrimary_RequestOptions.customJSONParse = current_API.customJSONParse;
		}
		
		Request(getPrimary_RequestOptions).get();
	});
}
appGlobal["getPrimary"] = getPrimary;

function processChannelList(id, website, streamSetting, response, nextPageToken){
	return new Promise(function(resolve, reject){
		let promises = new Map();
		
		let data = response.json;
		
		if(!channelInfos.get(website).has(id)){
			let defaultChannelInfos = channelInfos.get(website).set(id, {"liveStatus": {"API_Status": false, "notifiedStatus": false, "notifiedStatus_Vocal": false, "lastCheckStatus": "", "liveList": new Map()}, "streamName": (website_channel_id.test(id) === true)? website_channel_id.exec(id)[1] : id, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""});
		}
		
		let responseValidity = checkResponseValidity(website, response);
		if(responseValidity === "success"){
			let streamListData;
			if(typeof nextPageToken === "undefined" || nextPageToken === null){
				// First loop
				channelInfos.get(website).get(id).liveStatus.liveList = new Map();
				
				streamListData = websites.get(website).channelList(id, website, data);
			} else {
				streamListData = websites.get(website).channelList(id, website, data, nextPageToken);
			}
			
			if(!isMap(streamListData.streamList) || streamListData.streamList.size === 0){
				resolve((isMap(streamListData.streamList))? "EmptyList" : "InvalidList");
			} else {
				streamListData.streamList.forEach((value, contentId, array) => {
					channelInfos.get(website).get(id).liveStatus.liveList.set(contentId, "");
					
					if(streamListData.hasOwnProperty("primaryRequest") && typeof streamListData.primaryRequest === "boolean" && !streamListData.primaryRequest){
						promises.set(contentId, processPrimary(id, contentId, website, streamSetting, {"json": value}));
					} else {
						if(value !== null){
							if(!liveStatus.get(website).get(id).has(contentId)){
								let defaultStatus = liveStatus.get(website).get(id).set(contentId, {"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""});
							}
							for(let infoId in value){
								if(value.hasOwnProperty(infoId)){
									liveStatus.get(website).get(id).get(contentId)[infoId] = value[infoId];
								}
							}
						}
						promises.set(contentId, getPrimary(id, contentId, website, streamSetting));
					}
				});
				
				if(streamListData.hasOwnProperty("nextPageToken")){
					promises.set("next", getPrimary(id, "", website, streamSetting, streamListData.nextPageToken));
				}
				
				PromiseWaitAll(promises)
					.then(resolve)
					.catch(reject)
			}
		} else {
			resolve(responseValidity);
		}
	})
}
function channelListEnd(website, id, streamSetting){
	liveStatus.get(website).get(id).forEach((value, contentId) => {
		if(channelInfos.get(website).get(id).liveStatus.liveList.has(contentId) === false){
			liveStatus.get(website).get(id).get(contentId).liveStatus.API_Status = false;
			doStreamNotif(website, id, contentId, streamSetting);
			liveStatus.get(website).get(id).delete(contentId);
		}
	})
}

function processPrimary(id, contentId, website, streamSetting, response){
	return new Promise(function(resolve, reject){
		let data = response.json;
		if(!liveStatus.get(website).get(id).has(contentId)){
			let defaultStatus = liveStatus.get(website).get(id).set(contentId, {"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""});
		}
		let responseValidity = liveStatus.get(website).get(id).get(contentId).liveStatus.lastCheckStatus = checkResponseValidity(website, response);
		if(responseValidity === "success"){
			let liveState = websites.get(website).checkLiveStatus(id, contentId, data, liveStatus.get(website).get(id).get(contentId), (channelInfos.has(website) && channelInfos.get(website).has(id))? channelInfos.get(website).get(id) : null);
			if(liveState !== null){
				liveStatus.get(website).get(id).set(contentId, liveState);
				
				if(websites.get(website).hasOwnProperty("API_second") === true){
					let second_API = websites.get(website).API_second(contentId);
					
					let second_API_RequestOptions = {
						url: second_API.url,
						overrideMimeType: second_API.overrideMimeType,
						onComplete: function (response) {
							let data_second = response.json;
							
							if(!DATAs.get(`${website}/${id}`).has(contentId)){
								DATAs.get(`${website}/${id}`).set(contentId, new Map())
							}
							DATAs.get(`${website}/${id}`).get(contentId).set("getSecond", {"url": response.url, "data": data_second});
							
							let responseValidity = checkResponseValidity(website, response);
							if(responseValidity === "success"){
								let newLiveStatus = websites.get(website).seconderyInfo(id, contentId, data_second, liveStatus.get(website).get(id).get(contentId));
								if(typeof newLiveStatus === "object" && newLiveStatus !== null){
									liveStatus.get(website).get(id).set(contentId, newLiveStatus);
									resolve("StreamChecked_With2ndAPI");
								} else {
									resolve("StreamChecked");
								}
							} else {
								resolve(responseValidity);
							}
							//doStreamNotif(website, id, contentId, streamSetting);
							//setIcon();
						}
					};
					
					if(second_API.hasOwnProperty("headers") === true){
						second_API_RequestOptions.headers = second_API.headers;
					}
					if(second_API.hasOwnProperty("content")=== true){
						second_API_RequestOptions.content = second_API.content;
					}
					if(second_API.hasOwnProperty("contentType") === true){
						second_API_RequestOptions.contentType = second_API.contentType;
					}
					if(second_API.hasOwnProperty("Request_documentParseToJSON") === true){
						second_API_RequestOptions.Request_documentParseToJSON = second_API.Request_documentParseToJSON;
					}
					if(second_API.hasOwnProperty("customJSONParse") === true){
						second_API_RequestOptions.customJSONParse = second_API.customJSONParse;
					}
					
					Request(second_API_RequestOptions).get();
				} else {
					resolve("StreamChecked");
					//doStreamNotif(website, id, contentId, streamSetting);
				}
			} else {
				consoleMsg("warn", "Unable to get stream state.");
				resolve("liveState is null");
			}
		} else {
			resolve(responseValidity);
		}
	})
}
function getChannelInfo(website, id){
	return new Promise(function(resolve, reject){
		let channelInfos_API = websites.get(website).API_channelInfos(id);
		
		if(!channelInfos.get(website).has(id)){
			let defaultChannelInfos = channelInfos.get(website).set(id, {"liveStatus": {"API_Status": false, "notifiedStatus": false, "notifiedStatus_Vocal": false, "lastCheckStatus": ""}, "streamName": (website_channel_id.test(id) === true)? website_channel_id.exec(id)[1] : id, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""});
		}
		if(websites.get(website).hasOwnProperty("API_channelInfos") === true){
			let getChannelInfo_RequestOptions = {
				url: channelInfos_API.url,
				overrideMimeType: channelInfos_API.overrideMimeType,
				onComplete: function (response) {
					let data_channelInfos = response.json;
					
					if(!DATAs.has(`${website}/${id}`)){
						DATAs.set(`${website}/${id}`, new Map());
					}
					DATAs.get(`${website}/${id}`).set("getChannelInfo", {"url": response.url, "data": data_channelInfos});
					
					let responseValidity = channelInfos.get(website).get(id).liveStatus.lastCheckStatus = checkResponseValidity(website, response);
					if(responseValidity === "success"){
						let newChannelInfos = websites.get(website).channelInfosProcess(id, data_channelInfos, channelInfos.get(website).get(id));
						if(typeof newChannelInfos === "object" && newChannelInfos !== null){
							channelInfos.get(website).set(id, newChannelInfos);
						}
					}
					resolve(responseValidity);
				}
			};
			
			if(channelInfos_API.hasOwnProperty("headers") === true){
				getChannelInfo_RequestOptions.headers = channelInfos_API.headers;
			}
			if(channelInfos_API.hasOwnProperty("content") === true){
				getChannelInfo_RequestOptions.content = channelInfos_API.content;
			}
			if(channelInfos_API.hasOwnProperty("contentType") === true){
				getChannelInfo_RequestOptions.contentType = channelInfos_API.contentType;
			}
			if(channelInfos_API.hasOwnProperty("Request_documentParseToJSON") === true){
				getChannelInfo_RequestOptions.Request_documentParseToJSON = channelInfos_API.Request_documentParseToJSON;
			}
			if(channelInfos_API.hasOwnProperty("customJSONParse") === true){
				getChannelInfo_RequestOptions.customJSONParse = channelInfos_API.customJSONParse;
			}
			
			Request(getChannelInfo_RequestOptions).get();
		}
	})
}

function importButton(website){
	let importationPromiseEnd = (reason) => {
		consoleDir(reason, `Importation for ${website} finished`);
		if(typeof reason === "string" && reason === "ImportEnd"){
			doNotif({
				"message": i18ex._("importation_finished", {"website": (websites.get(website).hasOwnProperty("title"))? websites.get(website).title : website})
			})
				.catch(err=>{
					consoleMsg("warn", err);
				})
			;
		} else if(typeof reason === "string" && reason === "ImportEnd_DataNull"){
			doNotif({
				"message": i18ex._("importation_finished_DataNull",
					{
						"website": ((websites.get(website).hasOwnProperty("title"))? websites.get(website).title : website),
						"reason": ((website !== "youtube")? i18ex._("importError_checkId") : i18ex._("importError_checkYouTubeConnexion"))
					})
			})
				.catch(err=>{
					consoleMsg("warn", err);
				})
			;
		}
		refreshPanel(false);
	};
	if(typeof websites.get(website).importAPIGetUserId === "function" && typeof websites.get(website).importGetUserId === "function"){
		let importAPIGetUserId = websites.get(website).API(`${getPreference(`${website}_user_id`)}`);
		Request({
			url: importAPIGetUserId.url,
			overrideMimeType: importAPIGetUserId.overrideMimeType,
			onComplete: function (response) {
				let data = response.json;
				
				if(checkResponseValidity(website, response) !== "success"){
					consoleMsg("warn", `Sometimes bad things just happen - ${website} - ${response.url}`);
					doNotif({
						"message": i18ex._("An_error_occurred_when_importing_check_your_id_or_the_website_availability")
					})
						.catch(err=>{
							consoleMsg("warn", err);
						})
					;
				} else {
					consoleDir(data, `${website} - ${response.url}`);
					
					let real_id = websites.get(website).importGetUserId(data);
					
					importStreams(website, real_id)
						.then(importationPromiseEnd)
						.catch(importationPromiseEnd)
				}
			}
		}).get();
	} else {
		importStreams(website, getPreference(`${website}_user_id`))
			.then(importationPromiseEnd)
			.catch(importationPromiseEnd)
	}
}
function importStreams(website, id, url, pageNumber){
	return new Promise(function(resolve, reject){
		let current_API = websites.get(website).importAPI(id);
		
		if(typeof url === "string" && url !== ""){
			current_API.url = url;
		} else {
			timing(`import_${website}`);
		}
		let importStreams_RequestOptions = {
			url: current_API.url,
			overrideMimeType: current_API.overrideMimeType,
			onComplete: function (response) {
				let data = response.json;
				
				consoleDir(data, `${website} - ${id} (${response.url})`);
				
				let streamListSetting = new streamListFromSetting(website);
				
				let importStreamList_Data;
				if(typeof pageNumber === "number"){
					importStreamList_Data = websites.get(website).importStreamWebsites(id, data, streamListSetting, pageNumber);
				} else {
					importStreamList_Data = websites.get(website).importStreamWebsites(id, data, streamListSetting);
				}
				
				if(importStreamList_Data.list !== null){
					for(let id of importStreamList_Data.list){
						streamListSetting.addStream(website, id, "");
					}
					streamListSetting.update();
					
					if(importStreamList_Data.hasOwnProperty("next") === true && importStreamList_Data.next !== null){
						if(importStreamList_Data.next.hasOwnProperty("pageNumber") === true){
							importStreams(website, id, importStreamList_Data.next.url, importStreamList_Data.next.pageNumber)
								.then(resolve)
								.catch(resolve)
						} else {
							importStreams(website, id, importStreamList_Data.next.url)
								.then(resolve)
								.catch(resolve)
						}
					} else {
						importStreamsEnd(website, id);
						resolve("ImportEnd");
					}
				} else {
					importStreamsEnd(website, id);
					resolve("ImportEnd_DataNull");
				}
			}
		};
		
		if(current_API.hasOwnProperty("headers") === true){
			importStreams_RequestOptions.headers = current_API.headers;
		}
		if(current_API.hasOwnProperty("contentType") === true){
			importStreams_RequestOptions.contentType = current_API.contentType;
		}
		if(current_API.hasOwnProperty("Request_documentParseToJSON") === true){
			importStreams_RequestOptions.Request_documentParseToJSON = current_API.Request_documentParseToJSON;
		}
		if(current_API.hasOwnProperty("xmlToJSON") === true){
			importStreams_RequestOptions.xmlToJSON = true;
		}
		if(current_API.hasOwnProperty("content") === true){
			importStreams_RequestOptions.content = current_API.content;
		}

		if(current_API.hasOwnProperty("customJSONParse") === true){
			importStreams_RequestOptions.customJSONParse = current_API.customJSONParse;
		}
		
		Request(importStreams_RequestOptions).get();
	})
}
function importStreamsEnd(website, id){
	setIcon();
	timingEnd(`import_${website}`);
}

//				------ Load / Unload Event(s) ------				//

// Load online/offline badges
let online_badgeData = null;
let offline_badgeData = null;

function loadSVGAsCanvas(id, src, width, height){
	return new Promise((resolve, reject) => {
		let old_node = document.querySelector(`canvas#id`);
		if(old_node !== null){
			old_node.parentNode.removeChild(old_node);
		}
		
		let canvasNode = document.createElement('canvas');
		canvasNode.id = id;
		canvasNode.width = width;
		canvasNode.height = height;
		document.querySelector("body").appendChild(canvasNode);
		  
		// Get drawing context for the Canvas
		let canvasContext = canvasNode.getContext('2d');
		  
		// Load up our image.
		let mySVG = new Image();
		mySVG.src = src;
		mySVG.width = width;
		mySVG.height = height;
		// Render our SVG image to the canvas once it loads.
		mySVG.onload = function(){
			canvasContext.drawImage(mySVG, 0, 0, width, height);
			resolve(canvasContext.getImageData(0, 0, width, height));
		}
	})
}
function loadBadges(){
	return new Promise((resolve, reject) => {
		let canvasPromises = new Map();
		
		canvasPromises.set("live_online", loadSVGAsCanvas("live_online", "/data/live_online.svg", 19, 19));
		canvasPromises.get("live_online").then((data) => {
			if(data instanceof ImageData){
				online_badgeData = data;
			}
		});
		canvasPromises.set("live_offline", loadSVGAsCanvas("live_offline", "/data/live_offline.svg", 19, 19));
		canvasPromises.get("live_offline").then((data) => {
			if(data instanceof ImageData){
				offline_badgeData = data;
			}
		});
		
		PromiseWaitAll(canvasPromises)
			.then(resolve)
			.catch(reject)
	})
}
loadBadges();

function getRedirectedURL(URL, maxRedirect){
	return new Promise((resolve, reject) => {
		Request({
			url: URL,
			contentType: "document",
			onComplete: function (data) {
				if(data.response === null){
					resolve(URL);
				} else {
					let redirectMetaNode = data.response.querySelector("meta[http-equiv=refresh]");
					let getURL = /0;URL\=(.*)/i;
					
					if(typeof maxRedirect === "number" && redirectMetaNode !== null && getURL.test(redirectMetaNode.content)){
						let newURL = getURL.exec(redirectMetaNode.content)[1];
						getRedirectedURL(newURL, maxRedirect - 1)
							.then((result) => {
								resolve(result);
							})
							.catch((result) => {
								reject(result);
							})
					} else if(typeof data.url === "string" && data.url !== ""){
						resolve(data.url);
					} else {
						resolve(URL);
					}
				}
			}
		}).get();
	})
}

// Begin to check lives
let interval;
function initAddon(){
	browser.contextMenus.removeAll();
	browser.contextMenus.create({
		"type": "normal",
		"id": "livenotifier_contextMenu",
		"title": i18ex._("Add_this"),
		"contexts": ["link"],
		"targetUrlPatterns": ["http://*/*", "https://*/*"],
		"onclick": function(info, tab){
			activeTab = tab;
			let url = info.linkUrl;
			consoleMsg("info", `[ContextMenu] URL: ${url}`);

			getRedirectedURL(url, 5)
				.then((result) => {
					if((result.indexOf("http://") === 0 || result.indexOf("https://") === 0) && url !== result){
						consoleMsg("info", `Redirected URL: ${result}`);
						addStreamFromPanel({"ContextMenu_URL": result});
					} else {
						addStreamFromPanel({"ContextMenu_URL": url});
					}
				})
				.catch((error) => {
					if(typeof error === "object"){
						consoleDir(error);
					} else {
						consoleMsg("warn", error);
					}
					addStreamFromPanel({"ContextMenu_URL": url});
				})
		}
	});

	/*		----- Move localStorage (HTML5) to Web Extension local storage area -----		*/
	for(let prefId in localStorage){
		if(localStorage.hasOwnProperty(prefId) && localStorage.getItem(prefId) !== null){
			savePreference(prefId, localStorage.getItem(prefId));
		}
	}
	localStorage.clear();

	let localToRemove = ["livestreamer_cmd_to_clipboard","livestreamer_cmd_quality","youtube_patreon_password"];
	/* 		----- Importation/Removal of old preferences -----		*/
	if(getPreference("stream_keys_list") === ""){
		let importSreamsFromOldVersion = function(){
			let somethingElseThanSpaces = /[^\s]+/;
			let newPrefTable = [];
			websites.forEach((websiteAPI, website) => {
				let pref = getPreference(`${website}_keys_list`);
				if(typeof pref !== "undefined" && pref !== "" && somethingElseThanSpaces.test(pref)){
					let myTable = pref.split(",");
					for(let i in myTable){
						if(myTable.hasOwnProperty(i)){
							newPrefTable.push(`${website}::${myTable[i]}`);
						}
					}
				}
			});
			savePreference("stream_keys_list", newPrefTable.join(", "));
			websites.forEach((websiteAPI, website) => {
				localToRemove.push(`${website}_keys_list`);
				if(chromeSettings.has(`${website}_keys_list`)){
					chromeSettings.delete(`${website}_keys_list`);
				}
			})
		};
		importSreamsFromOldVersion();
	}

	if(typeof getPreference("hitbox_user_id") === "string"){
		savePreference("smashcast_user_id", getPreference("hitbox_user_id"));
		localToRemove.push("hitbox_user_id");
	}
	if(typeof getPreference("beam_user_id") === "string"){
		savePreference("mixer_user_id", getPreference("beam_user_id"));
		localToRemove.push("beam_user_id");
	}

	/*if(typeof browser.runtime.onInstalled !== "undefined" && typeof getPreference("livenotifier_version") === "string"){
		localToRemove.push("livenotifier_version");
		/*if(appGlobal.currentPreferences.hasOwnProperty("livenotifier_version")){
			delete appGlobal.currentPreferences.livenotifier_version;
		}
	}*/
	if(typeof getPreference("notification_type") === "string"){
		localToRemove.push("notification_type");
		if(chromeSettings.has("notification_type")){
			chromeSettings.delete("notification_type");
		}
	}
	if(localToRemove.length > 0){
		browser.storage.local.remove(localToRemove)
			.catch(err=>{
				if(err) consoleMsg("warn", `Error removing preference(s) from Web Extension local storage: ${err}`);
			})
		;
	}

	let toRemove = ["livenotifier_version","notification_type","livestreamer_cmd_to_clipboard","livestreamer_cmd_quality"];
	websites.forEach((websiteAPI, website) => {
		toRemove.push(`${website}_keys_list`);
	});

	if(typeof browser.storage.sync === "object"){
		browser.storage.sync.remove(toRemove)
			.catch(err=>{
				if(err) consoleMsg("warn", `Error removing preference(s) from Web Extension sync storage: ${err}`);
			})
		;
	}

	/* 		----- Fin Importation/Removal des vieux paramères -----		*/

	websites.forEach((websiteAPI, website) => {
		liveStatus.set(website, new Map());
		channelInfos.set(website, new Map());
	});

	checkLives();
}

// Checking if updated
let previousVersion = "";
let current_version = appGlobal["version"] = browser.runtime.getManifest().version;
function checkIfUpdated(details){
	let getVersionNumbers =  /^(\d*)\.(\d*)\.(\d*)$/;
	
	let installReason = details.reason;
	consoleMsg("info", `Runtime onInstalled reason: ${installReason}`);
	
	// Checking if updated
	//if(installReason == "update" || installReason == "unknown"){
		previousVersion = details.previousVersion;
		let previousVersion_numbers = getVersionNumbers.exec(previousVersion);
		let current_version_numbers = getVersionNumbers.exec(current_version);
		
		if(previousVersion !== current_version){
			if(current_version_numbers.length === 4 && previousVersion_numbers.length === 4){
				if((current_version_numbers[1] > previousVersion_numbers[1])
					||
					((current_version_numbers[1] === previousVersion_numbers[1]) && (current_version_numbers[2] > previousVersion_numbers[2]))
					||
					((current_version_numbers[1] === previousVersion_numbers[1]) && (current_version_numbers[2] === previousVersion_numbers[2]) && (current_version_numbers[3] > previousVersion_numbers[3]))
				){
					doNotif({
						"message": i18ex._("Addon_have_been_updated", {"version": current_version})
					})
						.catch(err=>{
							consoleMsg("warn", err);
						})
					;
				}
			}
		}
	/*}
	if(typeof browser.runtime.onInstalled == "object" && typeof browser.runtime.onInstalled.removeListener == "function"){
		browser.runtime.onInstalled.removeListener(checkIfUpdated);
	} else {*/
		savePreference("livenotifier_version", current_version);
	//}
}

(()=>{
	appGlobal.chromeSettings = chromeSettings;
	consoleDir(chromeSettings,"Current preferences in the local storage:");

	/*if(typeof browser.runtime.onInstalled == "object" && typeof browser.runtime.onInstalled.removeListener == "function"){
		browser.runtime.onInstalled.addListener(checkIfUpdated);
	} else {*/
	//consoleMsg("warn", "browser.runtime.onInstalled is not available");
	let details;
	if(typeof getPreference("livenotifier_version") === "string" && getPreference("livenotifier_version") !== ""){
		details = {
			"reason": "unknown",
			"previousVersion": getPreference("livenotifier_version")
		}
	} else {
		details = {
			"reason": "install",
			"previousVersion": "0.0.0"
		}
	}

	checkIfUpdated(details);
	//}

	zDK.loadJS(document, ["dailymotion.js", "mixer.js", "picarto_tv.js", "smashcast.js", "twitch.js", "youtube.js"], "/data/js/platforms/")
		.then(initAddon)
		.catch(initAddon)
	}
)();