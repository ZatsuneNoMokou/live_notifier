// Required SDK
const { ToggleButton } = require('sdk/ui/button/toggle'),
	{ Panel: NewPanel } = require("sdk/panel"),
	{ Request } = require("sdk/request"),
	self = require("sdk/self"),
	sp = require('sdk/simple-prefs'),
	clipboard = require("sdk/clipboard"),
	tabs = require("sdk/tabs"),
	{ browserWindows: windows} = require("sdk/windows"),
	ContextMenu = require("sdk/context-menu"),
	{setInterval, setTimeout, clearInterval} = require("sdk/timers"),
	{ get: _} = require("sdk/l10n"),
	notifications = require("sdk/notifications");

let simplePrefs = require('sdk/simple-prefs').prefs;

function getPreference(prefId){
	return simplePrefs[prefId];
}
function savePreference(prefId, value, updatePanel){
	simplePrefs[prefId] = value;
	if(typeof updatePanel == "undefined" || updatePanel == true){
		refreshPanel();
	}
}

function check_delay_onChange(){
	if(getPreference("check_delay") <1){
		savePreference("check_delay", 1);
	}
}
sp.on("check_delay", check_delay_onChange);

function getBooleanFromVar(string){
	switch(typeof string){
		case "boolean":
			return string;
			break;
	case "number":
		case "string":
			if(string == "true" || string == "on" || string == "1" || string == 1){
				return true;
			} else if(string == "false" || string == "off" || string == "0" || string == 0){
				return false;
			} else {
				console.warn(`getBooleanFromVar: Unkown boolean (${string})`);
				return string;
			}
			break;
		default:
			console.warn(`getBooleanFromVar: Unknown type to make boolean (${typeof string})`);
	}
}

const myIconURL = self.data.url("live_offline_64.svg"),
	myIconURL_16 = self.data.url("live_offline_16.svg"),
	myIconURL_online = {
		"16": "./live_online_16.svg",
		"32": "./live_online_32.svg",
		"64": "./live_online_64.svg"
	},
	myIconURL_offline = {
		"16": "./live_offline_16.svg",
		"32": "./live_offline_32.svg",
		"64": "./live_offline_64.svg"
	};

let websites = new Map();
let liveStatus = new Map();
let channelInfos = new Map();

let {options, options_default, options_default_sync} = require("./data/js/options-data.js");
(function(){
	let websitesToLoad = ["beam", "dailymotion", "hitbox", "twitch", "youtube"];
	websitesToLoad.forEach((website, i, array) => {
		websites.set(website, require(`./data/js/platforms/${websitesToLoad[i]}.js`));
	})
})();

websites.forEach((websiteAPI, website, array) => {
	liveStatus.set(website, new Map());
	channelInfos.set(website, new Map());
})

/* 		----- Importation/Removal of old preferences -----		*/
if(typeof getPreference("dailymotion_check_delay") == "number" && getPreference("dailymotion_check_delay") > 0 && getPreference("dailymotion_check_delay") != 5){
	console.info("[Live Notifier] Importing the check delay from the old preference");
	savePreference("check_delay", getPreference("dailymotion_check_delay"), false);
	delete simplePrefs["dailymotion_check_delay"];
}
if(getPreference("stream_keys_list") == ""){
	(function(){
		let somethingElseThanSpaces = /[^\s]+/;
		let newPrefTable = [];
		for(let website in websites){
			let pref = getPreference(`${website}_keys_list`);
			if(typeof pref != "undefined" && pref != "" && somethingElseThanSpaces.test(pref)){
				let myTable = pref.split(",");
				for(let i in myTable){
					newPrefTable.push(`${website}::${myTable[i]}`);
				}
			}
		}
		savePreference("stream_keys_list", newPrefTable.join(", "), false);
		for(let website in websites){
			let pref = getPreference(`${website}_keys_list`);
			if(typeof pref != "undefined"){
				delete simplePrefs[`${website}_keys_list`];
			}
		}
	})();
}
if(typeof getPreference("livenotifier_version") == "string" && getPreference("livenotifier_version") != "0.0.0"){
	delete simplePrefs["livenotifier_version"];
}
/* 		----- Fin Importation/Removal des vieux paramères -----		*/

function encodeString(string){
	if(typeof string != "string"){
		console.warn(`encodeString: wrong type ${typeof string}`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%/g,"%25");
		string = string.replace(/\:/g,"%3A");
		string = string.replace(/,/g,"%2C");
	}
	return string;
}
function decodeString(string){
	if(typeof string != "string"){
		console.warn(`encodeString: wrong type ${typeof string}`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%3A/g,":");
		string = string.replace(/%2C/g,",");
		string = string.replace(/%25/g,"%");
	}
	return string;
}
function mapToObj(myMap){
	if(myMap instanceof Map){
		let obj = {};
		myMap.forEach((value, index, array) => {
			obj[index] = (value instanceof Map)? mapToObj(value) : value;
		})
		return obj;
	} else {
		throw 'myMap should be an Map';
	}
}
let streamListFromSetting_cache = null;
class streamListFromSetting{
	constructor(requested_website){
		let somethingElseThanSpaces = /[^\s]+/;
		this.stringData = getPreference("stream_keys_list");
		let pref = new String(this.stringData);
		
		if(streamListFromSetting_cache != null && streamListFromSetting_cache.hasOwnProperty("stringData") && streamListFromSetting_cache.stringData == pref){
			//console.log("[Live notifier] streamListFromSetting: Using cache")
			this.mapDataAll = streamListFromSetting_cache.mapDataAll;
			//this.objDataAll = mapToObj(this.mapDataAll);
			if(typeof requested_website == "string" && requested_website != ""){
				this.mapData = this.mapDataAll.get(requested_website);
				//this.objData = this.objDataAll[requested_website];
				this.website = requested_website;
			}
			return this;
		}
		
		let mapDataAll = new Map();
		
		websites.forEach((websiteAPI, website, array) => {
			mapDataAll.set(website, new Map());
		})
		
		if(pref != "" && somethingElseThanSpaces.test(pref)){
			let myTable = pref.split(",");
			let reg= /\s*([^\s\:]+)\:\:([^\s]+)\s*(.*)?/;
			if(myTable.length > 0){
				for(let i in myTable){
					let url = /((?:http|https):\/\/.*)\s*$/;
					let filters = /\s*(?:(\w+)\:\:(.+)\s*)/;
					let cleanEndingSpace = /(.*)\s+$/;
					
					let result=reg.exec(myTable[i]);
					if(result == null){
						console.warn(`Error with ${myTable[i]}`);
						continue;
					}
					let website = result[1];
					let id = result[2];
					let data = result[3];
					
					if(!(result.length == 3 || result.length == 4)){
						// Skip invalid items
						continue;
					}
					if(websites.has(website) == false){
						// Skip websites not supported, or not yet
						//continue;
						mapDataAll.set(website, new Map());
					}
					mapDataAll.get(website).set(id, {hide: false, ignore: false, iconIgnore: false, notifyOnline: getPreference("notify_online"), notifyOffline: getPreference("notify_offline"), streamURL: ""});
					
					if(typeof data != "undefined"){
						if(url.test(data) == true){
							let url_result = url.exec(data);
							mapDataAll.get(website).get(id).streamURL = url_result[1];
							data = data.replace(url_result[0],"");
						}
						
						if(filters.test(data)){
							let filters_array = new Array();
							
							let filter_id = /(?:(\w+)\:\:)/;
							let scan_string = data;
							while(filter_id.test(scan_string) == true){
								let current_filter_result = scan_string.match(filter_id);
								
								let current_filter_id = current_filter_result[1];
								
								scan_string = scan_string.substring(current_filter_result.index+current_filter_result[0].length, scan_string.length);
								
								let next_filter_result = scan_string.match(filter_id);
								let next_pos = (next_filter_result != null)? next_filter_result.index : scan_string.length;
								
								let current_data;
								if(next_filter_result != null){
									current_data = scan_string.substring(current_filter_result.index, next_filter_result.index);
								} else {
									current_data = scan_string.substring(current_filter_result.index, scan_string.length);
								}
								if(cleanEndingSpace.test(current_data)){
									current_data = cleanEndingSpace.exec(current_data)[1];
								}
								
								if(typeof mapDataAll.get(website).get(id)[current_filter_id] == "undefined"){
									mapDataAll.get(website).get(id)[current_filter_id] = [];
								}
								
								if(current_filter_id == "hide" || current_filter_id == "ignore" || current_filter_id == "iconIgnore" || current_filter_id == "notifyOnline" || current_filter_id == "notifyOffline"){
									let boolean = getBooleanFromVar(current_data);
									if(typeof boolean == "boolean"){
										current_data = boolean;
									} else {
										console.warn(`${current_filter_id} of ${id} should be a boolean`);
									}
									mapDataAll.get(website).get(id)[current_filter_id] = current_data;
								} else if(current_filter_id == "facebook" || current_filter_id == "twitter"){
									mapDataAll.get(website).get(id)[current_filter_id] = decodeString(current_data);
								}else {
									mapDataAll.get(website).get(id)[current_filter_id].push(decodeString(current_data));
								}
								scan_string = scan_string.substring(next_pos, scan_string.length);
							}
						}
					}
				}
			}
			this.mapDataAll = mapDataAll;
			//this.objDataAll = mapToObj(this.mapDataAll);
			if(typeof requested_website == "string" && requested_website != ""){
				this.mapData = this.mapDataAll.get(requested_website);
				//this.objData = this.objDataAll[requested_website];
				this.website = requested_website;
			}
		} else {
			this.mapDataAll = mapDataAll;
			//this.objDataAll = mapToObj(this.mapDataAll);
			if(typeof requested_website == "string" && requested_website != ""){
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
		let result = false
		this.mapDataAll.get(website).forEach((value, i, array) => {
			if(i.toLowerCase() == id.toLowerCase()){
				result = true;
			}
		})
		return result;
	}
	addStream(website, id, url){
		if(this.streamExist(website, id) == false){
			this.mapDataAll.get(website).set(id, {streamURL: url});
			this.mapData = this.mapDataAll.get(website);
			console.log(`${id} has been added`);
		}
	}
	deleteStream(website, id){
		if(this.streamExist(website, id)){
			this.mapDataAll.get(website).delete(id);
			this.mapData.delete(id);
			if(liveStatus.has(website) && liveStatus.get(website).has(id)){
				liveStatus.get(website).delete(id);
			}
			console.log(`${id} has been deleted`);
		}
	}
	update(){
		let newStreamPrefArray = [];
		this.mapDataAll.forEach((websiteData, website, array) => {
			websiteData.forEach((streamSettings, id, array) => {
				let filters = "";
				for(let j in streamSettings){
					if(j != "streamURL"){
						if(typeof streamSettings[j] == "object" && JSON.stringify(streamSettings[j]) == "[null]"){
							continue;
						}
						if((j == "facebook" || j == "twitter") && streamSettings[j] == ""){
							continue;
						}
						if((j == "hide" || j == "ignore" || j == "iconIgnore") && streamSettings[j] == false){
							continue;
						}
						if(j == "notifyOnline" && streamSettings[j] == getPreference("notify_online")){
							continue;
						}
						if(j == "notifyOffline" && streamSettings[j] == getPreference("notify_offline")){
							continue;
						}
						if(typeof streamSettings[j] == "boolean"){
							filters = filters + " " + j + "::" + streamSettings[j];
						}
						if(j == "facebook" || j == "twitter"){
							filters = filters + " " + j + "::" + encodeString(streamSettings[j]);
						} else {
							for(let k in streamSettings[j]){
								filters = filters + " " + j + "::" + encodeString(streamSettings[j][k]);
							}
						}
					}
				}
				
				let URL = (typeof streamSettings.streamURL != "undefined" && streamSettings.streamURL != "")? (" " + streamSettings.streamURL) : "";
				
				newStreamPrefArray.push(`${website}::${id}${filters}${URL}`);
			})
		})
		
		let newSettings = newStreamPrefArray.join(", ");
		savePreference("stream_keys_list", newSettings);
		setIcon();
		console.log(`Stream key list update: ${getPreference(`stream_keys_list`)}`);
		checkMissing();
	}
}

function getStreamURL(website, id, contentId, usePrefUrl){
	var streamList = (new streamListFromSetting(website)).mapData;
	
	if(streamList.has(id)){
		if(streamList.get(id).streamURL != "" && usePrefUrl == true){
			return streamList.get(id).streamURL;
		} else {
			if(liveStatus.get(website).get(id).has(contentId)){
				let streamData = liveStatus.get(website).get(id).get(contentId);
				if(typeof streamData.streamURL == "string" && streamData.streamURL != ""){
					return streamData.streamURL;
				}
			}
			if(channelInfos.get(website).has(id)){
				if(typeof channelInfos.get(website).get(id).streamURL == "string" && channelInfos.get(website).get(id).streamURL != ""){
						return channelInfos.get(website).get(id).streamURL
				}
			}
			switch(website){
				case "dailymotion":
					return `http://www.dailymotion.com/video/${id}`;
					break;
				case "hitbox":
					return `http://www.hitbox.tv/${id}`;
					break;
				case "twitch":
					return `http://www.twitch.tv/${id}`;
					break;
				case "beam":
					return `https://beam.pro/${id}`;
					break;
				case "youtube":
					if(website_channel_id.test(contentId) == true){
						return `https://youtube.com/channel/${website_channel_id.exec(id)[1]}`;
					} else {
						return `https://youtu.be/${contentId}`;
					}
					break;
				default:
					return null;
			}
		}
	}
}

var firefox_button = ToggleButton({
	id: "streamnotifier_button",
	label: _("Stream offline"),
	icon: myIconURL_offline,
	badge: "",
	onClick: handleChange
});

var panel = NewPanel({
	height: 350,
	width: 285,
	contentScriptFile: [self.data.url("js/perfect-scrollbar.min.js"), self.data.url("js/options-data.js"), self.data.url("js/panel_contentScriptFile.js")],
	contentScriptOptions: {
		"current_version": self.version
	},
	contentURL: self.data.url("panel.html"),
});

function refreshPanel(data){
	updatePanelData();
}
function refreshStreamsFromPanel(){
	if(appGlobal["checkingLivesFinished"]){
		checkLives()
			.then(done)
			.catch(done)
	}
	
	let done = function(reason){
		updatePanelData();
	}
}

let URLContext_Array = [];
websites.forEach((websiteAPI, website, array) => {
	websiteAPI.addStream_URLpatterns.forEach((source_website_patterns, source_website, array) => {
		for(let pattern of source_website_patterns){
			URLContext_Array.push(pattern);
		}
	})
})

ContextMenu.Item({
	label: _("Add this"),
	image: self.data.url("../icon.png"),
	context: [
		ContextMenu.SelectorContext("a[href]"),
		ContextMenu.PredicateContext(function(context){
				for(let i in URLContext_Array){
					if(URLContext_Array[i].test(context.linkURL) == true){
						return true;
					}
				}
				return false;
			})
	],
	contentScriptFile: self.data.url("js/page_getUrlLink.js"),
	onMessage: function(data){
		console.info(`[ContextMenu] URL: ${data}`);
		addStreamFromPanel({"ContextMenu_URL": data});
	}
});
function display_id(id){
	if(website_channel_id.test(id)){
		return _("The channel %d", website_channel_id.exec(id)[1]);
	} else {
		return _("The stream %d", id);
	}
}
function addStreamFromPanel(data){
	let current_tab = tabs.activeTab;
	let active_tab_url = current_tab.url;
	
	let type;
	let url_list;
	if(typeof data == "object"){
		console.dir(data);
		if(data.hasOwnProperty("ContextMenu_URL")){
			url_list = [data.ContextMenu_URL];
			type = "ContextMenu";
		} else if(data.hasOwnProperty("url")){
			url_list = [data.url];
			type = "url";
		} else if(data.hasOwnProperty("embed_list")){
			console.log("[Live notifier] AddStream - Embed list");
			url_list = data.embed_list;
			type = "embed";
		}
	} else {
		console.info("Current active tab: " + active_tab_url);
		url_list = [active_tab_url];
	}
	let pattern_found = false;
	for(let url of url_list){
		websites.forEach((websiteAPI, website, array) => {
			websiteAPI.addStream_URLpatterns.forEach((patterns, source_website, array) => {
				let streamListSetting = new streamListFromSetting(website);
				patterns.forEach((pattern, index, array) => {
					let id = "";
					if(pattern.test(url) && !pattern_found){
						pattern_found = true;
						id = pattern.exec(url)[1];
						if(streamListSetting.streamExist(website, id)){
							doNotif("Live notifier",`${display_id(id)} ${_("is_already_configured")}`);
							return true;
						} else {
							let current_API = websiteAPI.API_addStream(source_website, id, (websiteAPI.hasOwnProperty("APIs_RequiredPrefs") == true)? getAPIPrefsObject(websiteAPI.APIs_RequiredPrefs) : {});
							
							Request({
								url: current_API.url,
								overrideMimeType: current_API.overrideMimeType,
								onComplete: function (response) {
									let data = response.json;
									
									console.group()
									console.info(`${website} - ${response.url}`);
									console.dir(data);
									console.groupEnd();
									
									let responseValidity = checkResponseValidity(website, response);
									
									let streamId = websiteAPI.addStream_getId(source_website, id, response, streamListSetting, responseValidity);
									
									if(website == "dailymotion" && responseValidity == "invalid_parameter"){
										doNotif("Live notifier", _("No supported stream detected in the current tab, so, nothing to add."));
										return null;
									} else if(streamId == null){
										doNotif("Live notifier", `${display_id(id)} ${_("wasn't configured, but an error occurred when retrieving data.")}`);
										return null;
									} else if(typeof streamId == "boolean" && streamId == true){
										doNotif("Live notifier",`${display_id(id)} ${_("is already configured.")}`);
										return true;
									} else if(typeof streamId == "object" && streamId.hasOwnProperty("url")){
										addStreamFromPanel(streamId);
										return true;
									}
									
									if(streamListSetting.streamExist(website, streamId) == true){
										doNotif("Live notifier",`${display_id(streamId)} ${_("is already configured.")}`);
									} else {
										if(getPreference("confirm_addStreamFromPanel")){
											let addstreamNotifAction = new notifAction("addStream", {id: streamId, website: website, url: ((type == "embed")? active_tab_url : "")});
											doActionNotif(`Live notifier`, `${display_id(streamId)} ${_("wasn't configured, and can be added.")}`, addstreamNotifAction);
										} else {
											streamListSetting.addStream(website, streamId, ((type == "embed")? active_tab_url : ""));
											streamListSetting.update();
											doNotif("Live notifier", `${display_id(streamId)} ${_("wasn't configured, and have been added.")}`);
											// Update the panel for the new stream added
											setTimeout(function(){
												refreshPanel(false);
											}, 5000);
										}
									}
								}
							}).get();
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
	if(typeof data != "object" && type != "ContextMenu" && type != "url"){
		if(!data.hasOwnProperty("embed_list")){
			let worker = current_tab.attach({
				contentScriptFile: self.data.url("js/page_getEmbedList.js")
			});
			worker.port.on("addStream", function(data){
				addStreamFromPanel(data);
				worker.detach();
			})
		}
	} else {
		doNotif("Live notifier", _("No supported stream detected in the current tab, so, nothing to add."));
	}
}
function deleteStreamFromPanel(data){
	let streamListSetting = new streamListFromSetting(data.website);
	let id = data.id;
	let website = data.website;
	if(streamListSetting.streamExist(website, id)){
		if(getPreference("confirm_deleteStreamFromPanel")){
			let deletestreamNotifAction = new notifAction("deleteStream", {id: id, website: website});
			doActionNotif(`Live notifier`, `${display_id(id)} ${_("will be deleted, are you sure?")}`, deletestreamNotifAction);
		} else {
			streamListSetting.deleteStream(website, id);
			streamListSetting.update();
			doNotif("Live notifier", `${display_id(id)} ${_("has been deleted.")}`);
			// Update the panel for the new stream added
			refreshPanel();
		}
	}
}

function settingUpdate(data){
	let settingName = data.settingName;
	let settingValue = data.settingValue;
	
	let updatePanel = true;
	if(typeof data.updatePanel != "undefined"){
		updatePanel = data.updatePanel;
	}
	
	if(typeof getPreference(settingName) == "number" && typeof settingValue == "string"){
		settingValue = parseInt(settingValue);
	}
	console.log(`${settingName} - ${settingValue} (Update panel: ${updatePanel})`);
	if(typeof getPreference(settingName) != typeof settingValue){
		console.warn(`Setting (${settingName}) type: ${typeof getPreference(settingName)} - Incoming type: ${typeof settingValue}`);
	}
	savePreference(settingName, settingValue, updatePanel);
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
	
	let facebookID = (typeof streamList.get(id).facebook == "string" && streamList.get(id).facebook != "")? streamList.get(id).facebook : streamData.twitterID;
	let twitterID = (typeof streamList.get(id).twitter == "string" && streamList.get(id).twitter != "")? streamList.get(id).twitter : streamData.twitterID;
	
	let streamerAlias = streamName;
	/*
	if(facebookID != null && facebookID != ""){
		
	}*/
	let reg_testTwitterId= /\s*@(.+)/;
	if(twitterID != null && twitterID != ""){
		streamerAlias = ((reg_testTwitterId.test(twitterID))? "" : "@") + twitterID;
		console.info(`${id}/${contentId} (${website}) twitter ID: ${twitterID}`);
	}
	
	let shareMessage = `${_("I am watching the stream of")} ${streamerAlias}, "${streamStatus}"`;
	
	//tabs.open(`https:\/\/twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamURL}&hashtags=LiveNotifier${(twitterID != "")? `&related=${twitterID}` : ""}`);
	tabs.open(`https:\/\/twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamURL}${(twitterID != "")? `&related=${twitterID}` : ""}&via=LiveNotifier`);
}

function streamSetting_Update(data){
	let website = data.website;
	let id = data.id;
	let contentId = data.contentId;
	
	let streamSettingsData = data.streamSettingsData;
	
	let streamListSetting = new streamListFromSetting(website);
	let streamList = streamListSetting.mapData;
	
	for(let i in streamSettingsData){
		streamList.get(id)[i] = streamSettingsData[i];
	}
	streamListSetting.update();
}


function importButton_Panel(website){
	console.info(`Importing ${website}...`);
	importButton(website);
}

function importPrefsFromFile(data){
	for(let prefId in data){
		if(typeof options[prefId].type != "undefined" && options[prefId].type != "control" && options[prefId].type != "file" && typeof data[prefId] == typeof options_default_sync[prefId]){
			savePreference(prefId, data[prefId], false);
		} else {
			console.warn(`Error trying to import ${prefId}`);
		}
	}
	
	refreshStreamsFromPanel();
}
function getSyncPreferences(){
	let obj = {};
	for(let prefId in options){
		let option = options[prefId];
		if(option.hasOwnProperty("sync") == true && option.sync == false){
			continue;
		} else if(option.type == "control" || option.type == "file"){
			continue;
		} else {
			obj[prefId] = getPreference(prefId);
		}
	}
	return obj;
}
function export_preferences(){
	panel.port.emit("exportPrefsToFile", getSyncPreferences());;
}
sp.on("export_preferences", export_preferences);
function import_preferences(){
	panel.port.emit("import_preferences");
}
sp.on("import_preferences", import_preferences);

function sendTranslation(data){
	let result = JSON.parse(data);
	let translation = _(result["data-l10n-id"]);
	if(translation != result["data-l10n-id"]){
		result.translated = _(result["data-l10n-id"]);
	}
	panel.port.emit("translate", JSON.stringify(result));
}
panel.port.on("translate", sendTranslation)

panel.port.on("refreshPanel", refreshPanel);
panel.port.on("importStreams", importButton_Panel);
panel.port.on("refreshStreams", refreshStreamsFromPanel);
panel.port.on("addStream", addStreamFromPanel);
panel.port.on("deleteStream", deleteStreamFromPanel);
panel.port.on("copyLivestreamerCmd", copyLivestreamerCmd);
panel.port.on("openOnlineLive", openOnlineLive);
panel.port.on("openTab", openTabIfNotExist);
panel.port.on("setting_Update", settingUpdate);
panel.port.on("shareStream", shareStream);
panel.port.on("streamSetting_Update", streamSetting_Update);
panel.port.on("importPrefsFromFile", importPrefsFromFile);
panel.port.on("export_preferences", export_preferences);



let addon_fully_loaded = false;
let current_panel_theme,
	current_background_color;
function updatePanelData(){
	if(addon_fully_loaded == false){
		return;
	}
	
	if((typeof current_panel_theme != "string" && typeof current_background_color != "string") || current_panel_theme != getPreference("panel_theme") || current_background_color != getPreference("background_color")){
		console.log("Sending panel theme data");
		panel.port.emit("panel_theme", {"theme": getPreference("panel_theme"), "background_color": getPreference("background_color")});
	}
	current_panel_theme = getPreference("panel_theme");
	current_background_color = getPreference("background_color");
	
	//Clear stream list in the panel
	panel.port.emit("initList", {"group_streams_by_websites": getPreference("group_streams_by_websites"), "show_offline_in_panel": getPreference("show_offline_in_panel")});
	
	let streamListSettings = new streamListFromSetting().mapDataAll;
	streamListSettings.forEach((streamList, website, array) => {
		streamList.forEach((value, id, array) => {
			if(typeof streamList.get(id).ignore == "boolean" && streamList.get(id).ignore == true){
				//console.info(`[Live notifier - Panel] Ignoring ${id}`);
				return;
			}
			if(typeof streamList.get(id).hide == "boolean" && streamList.get(id).hide == true){
				//console.info(`[Live notifier - Panel] Hiding ${id}`);
				return;
			}
			
			if(liveStatus.has(website) && liveStatus.get(website).has(id) && liveStatus.get(website).get(id).size > 0){
				liveStatus.get(website).get(id).forEach((streamData, contentId, array) => {
					getCleanedStreamStatus(website, id, contentId, streamList.get(id), streamData.liveStatus.API_Status);
					
					if(streamData.liveStatus.filteredStatus || (getPreference("show_offline_in_panel") && !streamData.liveStatus.filteredStatus)){
						doStreamNotif(website, id, contentId, streamList.get(id));
						panel.port.emit("updateData", {
							"website": website,
							"id": id,
							"contentId": contentId,
							"type": "live",
							"streamData": streamData,
							"streamSettings": streamList.get(id),
							"streamUrl": getStreamURL(website, id, contentId, true)
						});
					}
				})
			} else {
				if(channelInfos.has(website) && channelInfos.get(website).has(id)){
						let streamData = channelInfos.get(website).get(id);
						let contentId = id;
						
						panel.port.emit("updateData", {
							"website": website,
							"id": id,
							"contentId": contentId,
							"type": "channel",
							"streamData": streamData,
							"streamSettings": streamList.get(id),
							"streamUrl": getStreamURL(website, id, contentId, true)
						});
				} else if(websites.has(website)){
					console.info(`Currrently no data for ${id} (${website})`);
				} else {
					let contentId = id;
					let streamData = {"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
					
					console.warn(`The website of ${id} ("${website}") is not supported or not loaded`);
					panel.port.emit("updateData", {
						"website": website,
						"id": id,
						"contentId": contentId,
						"type": "unsupported",
						"streamData": streamData,
						"streamSettings": streamList.get(id),
						"streamUrl": ""
					});
				}
			}
		})
	})
	
	liveStatus.forEach((website_liveStatus, website, array) => {
		website_liveStatus.forEach((id_liveStatus, id, array) => {
			// Clean the streams already deleted but status still exist
			if(!streamListSettings.get(website).has(id)){
				console.info(`${id} from ${website} was already deleted but not from liveStatus ${(channelInfos.get(website).has(id))? "and channelInfos" : ""}`);
				liveStatus.get(website).delete(id);
				if(channelInfos.get(website).has(id)){
					channelInfos.get(website).remove(id);
				}
			}
		})
	})
	
	checkMissing();
	
	//Update online steam count in the panel
	panel.port.emit("updateOnlineCount", (onlineCount == 0)? _("No stream online") :  _("%d stream(s) online", onlineCount));
	
	if(getPreference("show_offline_in_panel")){
		var offlineCount = getOfflineCount();
		panel.port.emit("updateOfflineCount", (offlineCount == 0)? _("No stream offline") :  _("%d stream(s) offline", offlineCount));
	} else {
		panel.port.emit("updateOfflineCount", "");
	}
	
	panel.port.emit("debug_checkingLivesState", checkingLivesFinished);
	
	for(let prefId in options){
		let option = options[prefId];
		if(option.hasOwnProperty("hidden") == true && typeof option.hidden == "boolean" && option.hidden == true){
			continue;
		}
		if(option.hasOwnProperty("showPrefInPanel") == true && typeof option.showPrefInPanel == "boolean" && option.showPrefInPanel == false){
			continue;
		}
		if(option.type == "control"){
			continue;
		} else {
			panel.port.emit("settingNodesUpdate", {settingName: prefId, settingValue: getPreference(prefId)});
		}
	}
}

function handleChange(state) {
	setIcon();
	updatePanelData();
	panel.show({
		position: firefox_button
	});
}

//Affichage des notifications en ligne / hors ligne
function copyLivestreamerCmd(data){
	let cmd = `livestreamer ${getStreamURL(data.website, data.id, data.contentId, false)} ${getPreference("livestreamer_cmd_quality")}`;
	let clipboard_success = clipboard.set(cmd, "text");
	if(clipboard_success){
		doNotif("Live notifier", _("Livestreamer command copied into the clipboard"));
	}
}
function openOnlineLive(data){
	openTabIfNotExist(data.streamUrl);
	if(getPreference("livestreamer_cmd_to_clipboard")){
		copyLivestreamerCmd(data);
	}
}

function openTabIfNotExist(url){
	console.log(url);
	let custom_url = url.toLowerCase().replace(/http(?:s)?\:\/\/(?:www\.)?/i,"");
	for(let tab of tabs){
		if(tab.url.toLowerCase().indexOf(custom_url) != -1){ // Mean the url was already opened in a tab
			tab.activate(); // Show the already opened tab
			return true; // Return true to stop the function as the tab is already opened
		}
	}
	// If the function is still running, it mean that the url isn't detected to be opened, so, we can open it
	tabs.open(url);
	return false; // Return false because the url wasn't already in a tab
}

function doNotif(title, message, imgurl) {
	doActionNotif(title,message,{},imgurl);
}

function doNotifUrl(title,message,url,imgurl){
	doActionNotif(title,message,new notifAction("openUrl",url),imgurl);
}


class notifAction{
	constructor(type, data){
		this.type = type;
		this.data = data;
	}
}
function doActionNotif(title, message, action, imgurl){
	console.info(`Notification (${(typeof action.type == "string")? action.type : "Unknown/No action"}): "${message}" (${imgurl})`);
	notifications.notify({
		title: title,
		text: message,
		iconURL: ((typeof imgurl == "string" && imgurl != "")? imgurl : myIconURL),
		onClick: function(){
			let website;
			let id;
			let streamList;
			if(action.type == "addStream" || action.type == "deleteStream"){
				website = action.data.website;
				streamListSetting = new streamListFromSetting(website);
				id = action.data.id;
			}
			switch(action.type){
				case "addStream":
					let url = action.data.url;
					streamListSetting.addStream(website, id, url);
					streamListSetting.update();
					// Update the panel for the new stream added
					setTimeout(function(){
						refreshPanel();
					}, 5000);
					doNotif("Live notifier", `${display_id(id)} ${_("have been added.")}`);
					break;
				case "deleteStream":
					streamListSetting.deleteStream(website, id);
					streamListSetting.update();
					// Update the panel for the deleted stream
					refreshPanel();
					doNotif("Live notifier", `${display_id(id)} ${_("has been deleted.")}`);
					break;
				case "openUrl":
					// Notification with openUrl action
					openTabIfNotExist(action.data);
					console.info(`Notification (openUrl): "${message}" (${action.data})`);
					break;
				case "function":
					// Notification with custom function as action
					action.data();
					break;
				default:
					// Nothing - Unknown action
			}
		}
	});
}

function getFilterListFromPreference(string){
	let list = string.split(",");
	for(let i in list){
		if(list[i].length == 0){
			delete list[i];
			// Keep a null item, but this null is not considered in for..in loops
		} else {
			list[i] = decodeString(list[i]);
		}
	}
	return list;
}
function getCleanedStreamStatus(website, id, contentId, streamSetting, isStreamOnline){
	let streamData = liveStatus.get(website).get(id).get(contentId);
	
	if(streamData.streamStatus != ""){
		let lowerCase_status = (streamData.streamStatus).toLowerCase();
		if(isStreamOnline){
			let whitelisted = false;
			
			if(streamSetting.statusWhitelist){
				let statusWhitelist = streamSetting.statusWhitelist;
				for(let i in statusWhitelist){
					if(lowerCase_status.indexOf(statusWhitelist[i].toLowerCase()) != -1){
						whitelisted = true;
						break;
					}
				}
			}
			if(getPreference("statusWhitelist") != ""){
				let statusWhitelist_List = getFilterListFromPreference(getPreference("statusWhitelist"));
				for(let i in statusWhitelist_List){
					if(lowerCase_status.indexOf(statusWhitelist_List[i].toLowerCase()) != -1){
						whitelisted = true;
						break;
					}
				}
			}
			if((streamSetting.statusWhitelist || getPreference("statusWhitelist") != "") && whitelisted == false){
				isStreamOnline = false;
				console.info(`${id} current status does not contain whitelist element(s)`);
			}
			
			let blacklisted = false;
			
			if(streamSetting.statusBlacklist){
				let statusBlacklist = streamSetting.statusBlacklist;
				for(let i in statusBlacklist){
					if(lowerCase_status.indexOf(statusBlacklist[i].toLowerCase()) != -1){
						blacklisted = true;
					}
				}
			}
			if(getPreference("statusBlacklist") != ""){
				let statusBlacklist_List = getFilterListFromPreference(getPreference("statusBlacklist"));
				for(let i in statusBlacklist_List){
					if(lowerCase_status.indexOf(statusBlacklist_List[i].toLowerCase()) != -1){
						blacklisted = true;
						break;
					}
				}
			}
			if((streamSetting.statusBlacklist || getPreference("statusBlacklist") != "") && blacklisted == true){
				isStreamOnline = false;
				console.info(`${id} current status contain blacklist element(s)`);
			}
		}
	}
	if(typeof streamData.streamGame == "string" && streamData.streamGame != ""){
		let lowerCase_streamGame = (streamData.streamGame).toLowerCase();
		if(isStreamOnline){
			let whitelisted = false;
			if(streamSetting.gameWhitelist){
				let gameWhitelist = streamSetting.gameWhitelist;
				for(let i in gameWhitelist){
					if(lowerCase_streamGame.indexOf(gameWhitelist[i].toLowerCase()) != -1){
						whitelisted = true;
						break;
					}
				}
			}
			if(getPreference("gameWhitelist") != ""){
				let gameWhitelist_List = getFilterListFromPreference(getPreference("gameWhitelist"));
				for(let i in gameWhitelist_List){
					if(lowerCase_streamGame.indexOf(gameWhitelist_List[i].toLowerCase()) != -1){
						whitelisted = true;
						break;
					}
				}
			}
			if((streamSetting.gameWhitelist || getPreference("gameWhitelist") != "") && whitelisted == false){
				isStreamOnline = false;
				console.info(`${id} current game does not contain whitelist element(s)`);
			}
			
			let blacklisted = false;
			if(streamSetting.gameBlacklist){
				let gameBlacklist = streamSetting.gameBlacklist;
				for(let i in gameBlacklist){
					if(lowerCase_streamGame.indexOf(gameBlacklist[i].toLowerCase()) != -1){
						blacklisted = true;
					}
				}
			}
			if(getPreference("gameBlacklist") != ""){
				let gameBlacklist_List = getFilterListFromPreference(getPreference("gameBlacklist"));
				for(let i in gameBlacklist_List){
					if(lowerCase_streamGame.indexOf(gameBlacklist_List[i].toLowerCase()) != -1){
						blacklisted = true;
						break;
					}
				}
			}
			if((streamSetting.gameBlacklist || getPreference("gameBlacklist") != "") && blacklisted == true){
				isStreamOnline = false;
				console.info(`${id} current game contain blacklist element(s)`);
			}
		}
		
	}
	streamData.liveStatus.filteredStatus = isStreamOnline;
	return isStreamOnline;
}

function doStreamNotif(website, id, contentId, streamSetting){
	let streamList = (new streamListFromSetting(website)).mapData;
	let streamData = liveStatus.get(website).get(id).get(contentId);
	
	let online = streamData.liveStatus.API_Status;
	
	let streamName = streamData.streamName;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamLogo = "";
	
	if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	let isStreamOnline_filtered = getCleanedStreamStatus(website, id, contentId, streamSetting, online);
	
	if(isStreamOnline_filtered){
		if(((typeof streamList.get(id).notifyOnline == "boolean")? streamList.get(id).notifyOnline : getPreference("notify_online")) == true && streamData.liveStatus.notifiedStatus == false){
			let streamStatus = ((streamData.streamStatus != "")? ": " + streamData.streamStatus : "") + ((streamData.streamGame != "")? (" (" + streamData.streamGame + ")") : "");
				if(streamLogo != ""){
					doNotifUrl(_("Stream online"), `${streamName}${streamStatus}`, getStreamURL(website, id, contentId, true), streamLogo);
				} else {
					doNotifUrl(_("Stream online"), `${streamName}${streamStatus}`, getStreamURL(website, id, contentId, true));
				}
		}
	} else {
		if(((typeof streamList.get(id).notifyOffline == "boolean")? streamList.get(id).notifyOffline : getPreference("notify_offline")) == true && streamData.liveStatus.notifiedStatus == true){
			if(streamLogo != ""){
				doNotif(_("Stream offline"),streamName, streamLogo);
			} else {
				doNotif(_("Stream offline"),streamName);
			}
		}
	}
	streamData.liveStatus.notifiedStatus = isStreamOnline_filtered;
}

function getOfflineCount(){
	var offlineCount = 0;
	
	let streamListSetting = (new streamListFromSetting()).mapDataAll;
	websites.forEach((websiteAPI, website, array) => {
		streamListSetting.get(website).forEach((streamList, id, array) => {
			if(typeof streamList.ignore == "boolean" && streamList.ignore == true){
				// Ignoring stream with ignore set to true from online count
				//console.log(`[Live notifier - getOfflineCount] ${id} of ${website} is ignored`);
				return;
			}
			
			if(liveStatus.get(website).has(id)){
				if(liveStatus.get(website).get(id).size == 0){
					offlineCount++;
				} else {
					liveStatus.get(website).get(id).forEach((streamData, contentId, array) => {
						if(!streamData.liveStatus.filteredStatus){
							offlineCount++;
						}
					})
				}
			}
		})
	})
	return offlineCount;
}

//Changement de l'icone
let onlineCount = 0;
function setIcon() {
	onlineCount = 0;
	let badgeOnlineCount = 0;
	
	liveStatus.forEach((website_liveStatus, website, array) => {
		let streamList = (new streamListFromSetting(website)).mapData;
		website_liveStatus.forEach((id_liveStatus, id, array) => {
			if(streamList.has(id) && (typeof streamList.get(id).ignore == "boolean" && streamList.get(id).ignore == true)){
				// Ignoring stream with ignore set to true from online count
				//console.log(`[Live notifier - setIcon] ${id} of ${website} is ignored`);
				return;
			} else {
				id_liveStatus.forEach((streamData, contentId, array) => {
					if(streamData.liveStatus.filteredStatus && streamList.has(id)){
						onlineCount++;
						if(streamList.has(id) && !(typeof streamList.get(id).iconIgnore == "boolean" && streamList.get(id).iconIgnore == true)){
							badgeOnlineCount++;
						}
					}
				})
			}
		})
	})
	
	
	if(badgeOnlineCount > 0){
		firefox_button.state("window", {
			"label": _("%d stream(s) online", badgeOnlineCount),
			"icon": myIconURL_online,
			badge: badgeOnlineCount,
			badgeColor: ""
		});
	} else {
		firefox_button.state("window", {
			"label": _("No stream online"),
			"icon": myIconURL_offline,
			badge: badgeOnlineCount,
			badgeColor: "#424242"
		});
	}
};

const website_channel_id = /channel\:\:(.*)/,
	facebookID_from_url = /(?:http|https):\/\/(?:www\.)?facebook.com\/([^\/]+)(?:\/.*)?/,
	twitterID_from_url = /(?:http|https):\/\/(?:www\.)?twitter.com\/([^\/]+)(?:\/.*)?/;

function checkResponseValidity(website, response){
	let data = response.json;
	
	if(data == null || typeof data != "object" || JSON.stringify(data) == "{}"){ // Empty or invalid JSON
		if(typeof response == "object" && response.hasOwnProperty("status") && typeof response.status == "number" && (/^4\d*$/.test(response.status) == true || /^5\d*$/.test(response.status) == true)){
			// Request Error
			console.warn("Unable to get stream state (request error).");
			return "request_error";
		} else {
			// Parse Error
			console.warn("Unable to get stream state (response is empty or not valid JSON).");
			return "parse_error";
		}
	}
	let state = websites.get(website).checkResponseValidity(data);
	switch(state){
		case "error":
			console.warn(`[${website}] Unable to get stream state (error detected).`);
			return "error";
			break;
		case "vod":
			console.warn(`[${website}] Unable to get stream state (vod detected).`);
			return "vod";
			break;
		case "notstream":
			console.warn(`[${website}] Unable to get stream state (not a stream).`);
			return "notstream";
			break;
		case "":
		case "success":
			return "success";
		default:
			console.warn(`[${website}] Unable to get stream state (${state}).`);
			return state;
			break;
	}
	
	return "success";
}
function getAPIPrefsObject(prefList){
	let obj = {}
	
	for(let prefID of prefList){
		obj[prefID] = getPreference(prefID);
	}
	
	return obj;
}

function isMap(myMap){
	return (myMap instanceof Map || myMap.constructor.name == "Map");
}
function PromiseWaitAll(promises){
	if(Array.isArray(promises) || promises instanceof Map){
		let count = (promises instanceof Map)? promises.size : promises.length;
		let results = {};
		return new Promise(function(resolve, reject){
			promises.forEach((promise, index, array) => {
				let handler = data => {
					results[index] = data;
					if(--count == 0){
						resolve(results);
					}
				}
				
				if(promise instanceof Promise){
					promise.then(handler);
					promise.catch(handler);
				} else {
					handler(promise);
				}
			})
			if(count == 0){
				resolve(results);
			}
		});
	} else {
		throw "promises should be an Array or Map of Promise"
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
function timing(id){
	performance.mark(id);
}
function timingEnd(id){
	let result = {};
	performance.measure(id, id);
	let measures = performance.getEntriesByName(id, "measure");
	if(measures.length > 0){
		let duration = measures[measures.length -1].duration;
		let extracted = convertMS(duration);
		return {
			"raw": duration,
			"timing": `${(extracted.d != 0)? `${extracted.d}d` : ""}${(extracted.h != 0)? `${extracted.h}h` : ""}${(extracted.m != 0)? `${extracted.m}m` : ""}${(extracted.s != 0)? `${extracted.s}s` : ""}${extracted.ms}ms`
		}
	} else {
		throw `${id} not started`
	}
}
function getBase64Picture(url){
	return new Promise(function(resolve, reject){
		let getPictureRequest_options = {
			"url": url,
			"contentType": "blob",
			"onComplete": function (RequestEvent) {
				let blob = RequestEvent.response;
				if(blob.type.indexOf("image/") == 0){
					let reader = new FileReader();
					reader.onload = function(event){
						if(typeof event.target.result == "string"){
							resolve(event.target.result);
						} else {
							throw "Error loading picture"
						}
					}
					reader.readAsDataURL(blob); //Convert the blob to base64
				} else {
					throw "Not image file type"
				}
			}
		}
		
		Request(getPictureRequest_options).get();
	})
}

let checkingLivesFinished = false,
	DATAs,
	needCheckMissing = false;
function checkLives(idArray){
	return new Promise(function(resolve, reject){
		let promises = new Map();
		
		DATAs = new Map();
		checkingLivesFinished = false;
		console.time("checkLives");
		
		let streamListSetting = new streamListFromSetting();
		
		let listToCheck;
		if(typeof idArray != "undefined" && idArray instanceof Map){
			listToCheck = idArray;
		} else {
			listToCheck = streamListSetting.mapDataAll;
			console.group();
			console.info("[Live Notifier] Checking lives...");
			console.dir(mapToObj(streamListSetting.mapDataAll));
			console.groupEnd();
		}
		
		websites.forEach((websiteAPI, website, array) => {
			if(listToCheck.has(website)){
				listToCheck.get(website).forEach((streamList, id, array) => {
					if(typeof streamList.ignore == "boolean" && streamList.ignore == true){
						//console.info(`Ignoring ${id}`);
						return;
					}
					let onStreamCheckEnd = function(reason){
						console.timeEnd(`${website}::${id}`);
						setIcon();
						if((typeof promiseResult == "string" && promiseResult.indexOf("StreamChecked") != -1) || (typeof promiseResult == "object" && JSON.stringify(promiseResult).indexOf("StreamChecked") != -1)){
							liveStatus.get(website).get(id).forEach((value, contentId, array) => {
								if((typeof promiseResult == "string" && promiseResult.indexOf("StreamChecked") != -1) || (typeof promiseResult == "object" && typeof promiseResult[contentId] == "string" && promiseResult[contentId].indexOf("StreamChecked") != -1)){
									doStreamNotif(website, id, contentId, streamList);
								}
							})
						}
					}
					console.time(`${website}::${id}`);
					promises.set(`${website}/${id}`, getPrimary(id, "", website, streamList));
					promises.get(`${website}/${id}`)
						.then(onStreamCheckEnd)
						.catch(onStreamCheckEnd)
				})
			}
		})
		
		let onPromiseEnd = function(result){
			console.group();
			console.info(`[Live notifier] Live check end`);
			
			console.group();
			console.info(`Promises result:`);
			console.dir(result);
			console.groupEnd();
			
			console.timeEnd("checkLives");
			
			console.group();
			console.info(`DATAs:`);
			console.dir(mapToObj(DATAs));
			console.groupEnd();
			
			console.groupEnd();
			checkingLivesFinished = true;
			resolve(result);
			
			if(!(typeof idArray != "undefined" && idArray instanceof Map)){ // Only reset interval if it's a "full" check
				clearInterval(interval);
				interval = setInterval(checkLives, getPreference('check_delay') * 60000);
			}
			
			if(needCheckMissing){
				checkMissing();
			}
		}
		if(promises.size == 0){
			setIcon();
		}
		PromiseWaitAll(promises)
			.then(onPromiseEnd)
			.catch(onPromiseEnd)
		
		if(!(typeof idArray != "undefined" && idArray instanceof Map)){ // Only reset interval if it's a "full" check
			clearInterval(interval);
			interval = setInterval(checkLives, getPreference('check_delay') * 60000);
		}
	})
}
function checkMissing(){
	if(checkingLivesFinished){
		let listToCheck = new Map();
		let streamListSetting = new streamListFromSetting().mapDataAll;
		websites.forEach((websiteAPI, website, array) => {
			streamListSetting.get(website).forEach((streamList, id, array) => {
				if(typeof streamList.ignore == "boolean" && streamList.ignore == true){
					return;
				}
				if(!(liveStatus.get(website).has(id))){
					console.info(`${id} from ${website} is not checked yet`);
					
					if(!listToCheck.has(website)){
						listToCheck.set(website, new Map())
					}
					listToCheck.get(website).set(id, streamList);
				}
			})
		})
		
		if(listToCheck.size > 0){
			let refresh = function(result){
				if(typeof refreshPanel == "function"){
					refreshPanel();
				} else {
					sendDataToMain("refreshPanel", "");
				}
			}
			checkLives(listToCheck)
				.then(refresh)
				.catch(refresh)
		}
	} else {
		needCheckMissing = true;
	}
}

function getPrimary(id, contentId, website, streamSetting, url, pageNumber){
	let promise = new Promise(function(resolve, reject){
		let current_API = websites.get(website).API((typeof contentId == "string" && contentId != "")? contentId :  id, (websites.get(website).hasOwnProperty("APIs_RequiredPrefs") == true)? getAPIPrefsObject(websites.get(website).APIs_RequiredPrefs) : {});
		if(typeof url == "string"){
			current_API.url = url;
		}
		
		let getPrimary_RequestOptions = {
			url: current_API.url,
			overrideMimeType: current_API.overrideMimeType,
			onComplete: function (response) {
				let data = response.json;
				
				if(!DATAs.has(`${website}/${id}`)){
					DATAs.set(`${website}/${id}`, new Map());
				}
				if(typeof contentId == "string" && contentId != ""){
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
				
				if(!(typeof contentId == "string" && contentId != "") && website_channel_id.test(id) == true){
					if(typeof pageNumber == "number"){
						processChannelList(id, website, streamSetting, response, pageNumber)
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
					if(!(typeof contentId == "string" && contentId != "")){
						contentId = id;
					}
					
					processPrimary(id, contentId, website, streamSetting, response)
						.then(resolve)
						.catch(reject)
				}
			}
		}
		
		if(current_API.hasOwnProperty("headers") == true){
			getPrimary_RequestOptions.headers = current_API.headers;
		}
		
		Request(getPrimary_RequestOptions).get();
	});
	return promise;
}

function processChannelList(id, website, streamSetting, response, pageNumber){
	let promise = new Promise(function(resolve, reject){
		let promises = new Map();
		
		let data = response.json;
		
		if(!channelInfos.get(website).has(id)){
			let defaultChannelInfos = channelInfos.get(website).set(id, {"liveStatus": {"API_Status": false, "notificationStatus": false, "lastCheckStatus": "", "liveList": {}}, "streamName": (website_channel_id.test(id) == true)? website_channel_id.exec(id)[1] : id, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""});
		}
		
		let responseValidity = checkResponseValidity(website, response);
		if(responseValidity == "success"){
			let streamListData;
			if(typeof pageNumber == "number"){
				streamListData = websites.get(website).channelList(id, website, data, pageNumber);
			} else {
				streamListData = websites.get(website).channelList(id, website, data);
			}
			
			if(typeof pageNumber != "number"){
				// First loop
				channelInfos.get(website).get(id).liveStatus.liveList = {};
			}
			
			if(!isMap(streamListData.streamList) || streamListData.streamList.size == 0){
				//getChannelInfo(website, id);
				channelListEnd(website, id, streamSetting);
				
				resolve((isMap(streamListData.streamList))? "EmptyList" : "InvalidList");
			} else {
				streamListData.streamList.forEach((value, contentId, array) => {
					channelInfos.get(website).get(id).liveStatus.liveList[contentId] = "";
					
					if(value == null){
						promises.set(contentId, contentId, getPrimary(id, contentId, website, streamSetting));
					} else {
						promises.set(contentId, processPrimary(id, contentId, website, streamSetting, {"json": value}));
					}
				})
				
				if(streamListData.hasOwnProperty("next") == true){
					if(streamListData.next == null){
						channelListEnd(website, id, streamSetting);
					} else {
						promises.set("next", getPrimary(id, "", website, streamSetting, streamListData.url, streamListData.next_page_number));
					}
				}
				
				PromiseWaitAll(promises)
					.then(resolve)
					.catch(reject)
			}
		} else {
			//getChannelInfo(website, id);
			channelListEnd(website, id, streamSetting);
			
			resolve(responseValidity);
		}
	});
	return promise;
}
function channelListEnd(website, id, streamSetting){
	for(let contentId in liveStatus.get(website).get(id)){
		if(channelInfos.get(website).get(id).liveStatus.liveList.hasOwnProperty(contentId) == false){
			liveStatus.get(website).get(id).get(contentId).liveStatus.API_Status = false;
			doStreamNotif(website, id, contentId, streamSetting);
			liveStatus.get(website).get(id).delete(contentId);
		}
	}
}

function processPrimary(id, contentId, website, streamSetting, response){
	let promise = new Promise(function(resolve, reject){
		let data = response.json;
		if(!liveStatus.get(website).get(id).has(contentId)){
			let defaultStatus = liveStatus.get(website).get(id).set(contentId, {"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""});
		}
		let responseValidity = liveStatus.get(website).get(id).get(contentId).liveStatus.lastCheckStatus = checkResponseValidity(website, response);
		if(responseValidity == "success"){
			let liveState = websites.get(website).checkLiveStatus(id, contentId, data, liveStatus.get(website).get(id).get(contentId), (channelInfos.has(website) && channelInfos.get(website).has(id))? channelInfos.get(website).get(id) : null);
			if(liveState != null){
				liveStatus.get(website).get(id).set(contentId, liveState);
				
				if(websites.get(website).hasOwnProperty("API_second") == true){
					let second_API = websites.get(website).API_second(contentId, (websites.get(website).hasOwnProperty("APIs_RequiredPrefs") == true)? getAPIPrefsObject(websites.get(website).APIs_RequiredPrefs) : {});
					
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
							if(responseValidity == "success"){
								let newLiveStatus = websites.get(website).seconderyInfo(id, contentId, data_second, liveStatus.get(website).get(id).get(contentId));
								if(typeof newLiveStatus == "object" && newLiveStatus != null){
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
					}
					
					if(second_API.hasOwnProperty("headers") == true){
						second_API_RequestOptions.headers = second_API.headers;
					}
					
					Request(second_API_RequestOptions).get();
				} else {
					resolve("StreamChecked");
					//doStreamNotif(website, id, contentId, streamSetting);
				}
			} else {
				console.warn("Unable to get stream state.");
				resolve("liveState is null");
			}
		} else {
			resolve(responseValidity);
		}
	});
	return promise;
}
function getChannelInfo(website, id){
	let promise = new Promise(function(resolve, reject){
		let channelInfos_API = websites.get(website).API_channelInfos(id, (websites.get(website).hasOwnProperty("APIs_RequiredPrefs") == true)? getAPIPrefsObject(websites.get(website).APIs_RequiredPrefs) : {});
		
		if(!channelInfos.get(website).has(id)){
			let defaultChannelInfos = channelInfos.get(website).set(id, {"liveStatus": {"API_Status": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": (website_channel_id.test(id) == true)? website_channel_id.exec(id)[1] : id, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""});
		}
		if(websites.get(website).hasOwnProperty("API_channelInfos") == true){
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
					if(responseValidity == "success"){
						let newChannelInfos = websites.get(website).channelInfosProcess(id, data_channelInfos, channelInfos.get(website).get(id));
						if(typeof newChannelInfos == "object" && newChannelInfos != null){
							channelInfos.get(website).set(id, newChannelInfos);
						}
					}
					resolve(responseValidity);
				}
			}
			
			if(channelInfos_API.hasOwnProperty("headers") == true){
				getChannelInfo_RequestOptions.headers = channelInfos_API.headers;
			}
			
			Request(getChannelInfo_RequestOptions).get();
		}
	});
	return promise;
}

function importButton(website){
	let importationPromiseEnd = (reason) => {
		console.group();
		console.info(`Importation for ${website} finished`);
		console.dir(reason);
		console.groupEnd();
		refreshPanel(false);
	}
	if(typeof websites.get(website).importAPIGetUserId == "function" && typeof websites.get(website).importGetUserId == "function"){
		let importAPIGetUserId = websites.get(website).API(`${getPreference(`${website}_user_id`)}`);
		Request({
			url: importAPIGetUserId.url,
			overrideMimeType: importAPIGetUserId.overrideMimeType,
			onComplete: function (response) {
				let data = response.json;
				
				if(checkResponseValidity(website, response) != "success"){
					console.warn(`Sometimes bad things just happen - ${website} - ${response.url}`);
					doNotif("Live notifier", _("An error occurred when importing, check your id or the website availability"));
				} else {
					console.group();
					console.info(`${website} - ${response.url}`);
					console.dir(data);
					console.groupEnd();
					
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
		let current_API = websites.get(website).importAPI(id, (websites.get(website).hasOwnProperty("APIs_RequiredPrefs") == true)? getAPIPrefsObject(websites.get(website).APIs_RequiredPrefs) : {});
		if(typeof url == "string" && url != ""){
			current_API.url = url;
		} else {
			console.time(`${website}::${id}`);
		}
		let importStreams_RequestOptions = {
			url: current_API.url,
			overrideMimeType: current_API.overrideMimeType,
			onComplete: function (response) {
				let data = response.json;
				
				console.group();
				console.info(`${website} - ${id} (${response.url})`);
				console.dir(data);
				console.groupEnd();
				
				let streamListSetting = new streamListFromSetting(website);
				
				let importStreamList_Data;
				if(typeof pageNumber == "number"){
					importStreamList_Data = websites.get(website).importStreamWebsites(id, data, streamListSetting, pageNumber);
				} else {
					importStreamList_Data = websites.get(website).importStreamWebsites(id, data, streamListSetting);
				}
				
				
				for(let id of importStreamList_Data.list){
					streamListSetting.addStream(website, id, "");
				}
				streamListSetting.update();
				
				if(importStreamList_Data.hasOwnProperty("next") == true && importStreamList_Data.next != null){
					if(importStreamList_Data.next.hasOwnProperty("pageNumber") == true){
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
				
			}
		}
		
		if(current_API.hasOwnProperty("headers") == true){
			importStreams_RequestOptions.headers = current_API.headers;
		}
		
		Request(importStreams_RequestOptions).get();
	})
}
function importStreamsEnd(website, id){
	setIcon();
	console.timeEnd(`${website}::${id}`);
}

function importDailymotionButton(){importButton("dailymotion");}
sp.on("dailymotion_import", importDailymotionButton);
function importTwitchButton(){importButton("twitch");}
sp.on("twitch_import", importTwitchButton);
function importHitboxButton(){importButton("hitbox");}
sp.on("hitbox_import", importHitboxButton);
function importBeamButton(){importButton("beam");}
sp.on("beam_import", importBeamButton);


//				------ Load / Unload Event(s) ------				//

// Begin to check lives
var interval

let current_version = self.version;
let loadReason = "unknown";
function windowsFocusChange(window){
	console.log("[Live notifier] Active window change: icon update");
	setIcon();
}
exports.main = function(options, callbacks){
	checkLives();
	
	// Checking if updated
	loadReason = options.loadReason;
	console.info(`Load reason: ${loadReason}`);
	if(loadReason == "upgrade"){
		doNotif("Live notifier", _("Addon have been updated (version %d)", current_version));
	}
	
	windows.on('activate', windowsFocusChange);
	
	// Avoid panel data update before this variable
	addon_fully_loaded = true;
}

exports.onUnload = function (reason) {
	try{
		clearInterval(interval);
		sp.removeListener("check_delay", check_delay_onChange);
		panel.port.removeListener("refreshPanel", refreshPanel);
		panel.port.removeListener("importStreams", importButton_Panel);
		panel.port.removeListener("refreshStreams", refreshStreamsFromPanel);
		panel.port.removeListener("addStream", addStreamFromPanel);
		panel.port.removeListener("deleteStream", deleteStreamFromPanel);
		panel.port.removeListener("openTab", openTabIfNotExist);
		panel.port.removeListener("translate", sendTranslation);
		panel.port.removeListener("copyLivestreamerCmd", copyLivestreamerCmd);
		panel.port.removeListener("openOnlineLive", openOnlineLive);
		panel.port.removeListener("openTab", openTabIfNotExist);
		panel.port.removeListener("setting_Update", settingUpdate);
		panel.port.removeListener("shareStream", shareStream);
		panel.port.removeListener("streamSetting_Update", streamSetting_Update);
		panel.port.removeListener("importPrefsFromFile", importPrefsFromFile);
		panel.port.removeListener("export_preferences", export_preferences);
		sp.removeListener("twitch_import", importTwitchButton);
		windows.removeListener("activate", windowsFocusChange);
	}
	catch(err){
		console.warn(err);
	}
}

