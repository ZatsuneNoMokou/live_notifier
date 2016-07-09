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

function Request_Get(options){
	Request(options).get();
}

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
		savePreference("check_delay") = 1;
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

let websites = {};
let liveStatus = {};
let channelInfos = {};

(function(){
	let websitesToLoad = ["beam","dailymotion","hitbox","twitch"];
	for(let i in websitesToLoad){
		websites[websitesToLoad[i]] = require(`./data/js/platforms/${websitesToLoad[i]}.js`)
	}
})();

for(let website in websites){
	liveStatus[website] = {};
	channelInfos[website] = {};
}

/* 		----- Importation/Removal of old preferences -----		*/
if(typeof getPreference("dailymotion_check_delay") == "number" && getPreference("dailymotion_check_delay") > 0 && getPreference("dailymotion_check_delay") != 5){
	console.info("[Live Notifier] Importing the check delay from the old preference");
	savePreference("check_delay", getPreference("dailymotion_check_delay"), false);
	delete simplePrefs["dailymotion_check_delay"];
}
if(getPreference("stream_keys_list") == ""){
	(function(){
		let somethingElseThanSpaces = /[^\s]+/;
		let newPrefTable = new Array();
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
let streamListFromSetting_cache = null;
class streamListFromSetting{
	constructor(requested_website){
		let somethingElseThanSpaces = /[^\s]+/;
		this.stringData = getPreference("stream_keys_list");
		let pref = new String(this.stringData);
		
		if(streamListFromSetting_cache != null && streamListFromSetting_cache.hasOwnProperty("stringData") && streamListFromSetting_cache.stringData == pref){
			//console.log("[Live notifier] streamListFromSetting: Using cache")
			if(typeof requested_website == "string" && requested_website != ""){
				this.objData = streamListFromSetting_cache.obj[requested_website];
				this.website = requested_website;
			}
			this.objDataAll = streamListFromSetting_cache.obj;
		}
		
		let obj = {};
		for(let website in websites){
			obj[website] = {};
		}
		if(pref != "" && somethingElseThanSpaces.test(pref)){
			let myTable = pref.split(",");
			let reg= /\s*([^\s\:]+)\:\:([^\s]+)\s*(.*)?/;
			if(myTable.length > 0){
				for(let i in myTable){
					let url = /((?:http|https):\/\/.*)\s*$/;
					let filters = /\s*(?:(\w+)\:\:(.+)\s*)/;
					let cleanEndingSpace = /(.*)\s+$/;
					
					let result=reg.exec(myTable[i]);
					let website = result[1];
					let id = result[2];
					let data = result[3];
					
					obj[website][id] = {hide: false, ignore: false, notifyOnline: getPreference("notify_online"), notifyOffline: getPreference("notify_offline"), streamURL: ""};
					
					if(typeof data != "undefined"){
						if(url.test(data) == true){
							let url_result = url.exec(data);
							obj[website][id].streamURL = url_result[1];
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
								
								if(typeof obj[website][id][current_filter_id] == "undefined"){
									obj[website][id][current_filter_id] = new Array();
								}
								
								if(current_filter_id == "hide" || current_filter_id == "ignore" || current_filter_id == "notifyOnline" || current_filter_id == "notifyOffline"){
									let boolean = getBooleanFromVar(current_data);
									if(typeof boolean == "boolean"){
										current_data = boolean;
									} else {
										console.warn(`${current_filter_id} of ${id} should be a boolean`);
									}
									obj[website][id][current_filter_id] = current_data;
								} else if(current_filter_id == "facebook" || current_filter_id == "twitter"){
									obj[website][id][current_filter_id] = decodeString(current_data);
								}else {
									obj[website][id][current_filter_id].push(decodeString(current_data));
								}
								scan_string = scan_string.substring(next_pos, scan_string.length);
							}
						}
					}
				}
			}
			if(typeof requested_website == "string" && requested_website != ""){
				this.objData = obj[requested_website];
				this.website = requested_website;
			}
			this.objDataAll = obj;
		} else {
			if(typeof requested_website == "string" && requested_website != ""){
				this.objData = obj[requested_website];
				this.website = requested_website;
			}
			this.objDataAll = obj;
		}
		
		// Update cache
		streamListFromSetting_cache = {
			"stringData": this.stringData,
			"obj": obj
		}
	}
	
	streamExist(website, id){
		for(let i in this.objDataAll[website]){
			if(i.toLowerCase() == id.toLowerCase()){
				return true;
			}
		}
		return false;
	}
	addStream(website, id, url){
		if(this.streamExist(website, id) == false){
			this.objDataAll[website][id] = {streamURL: url};
			this.objData = this.objDataAll[website];
			console.log(`${id} has been added`);
			
			try{
				getPrimary(id, website, id);
			}
			catch(error){
				console.warn(`[Live notifier] ${error}`);
			}
		}
	}
	deleteStream(website, id){
		if(this.streamExist(website, id)){
			delete this.objDataAll[website][id];
			delete this.objData[id];
			if(typeof liveStatus[website][id] != "undefined"){
				delete liveStatus[website][id];
			}
			console.log(`${id} has been deleted`);
		}
	}
	update(){
		let array = new Array();
		for(let website in this.objDataAll){
			for(let id in this.objDataAll[website]){
				let filters = "";
				for(let j in this.objDataAll[website][id]){
					if(j != "streamURL"){
						if(typeof this.objDataAll[website][id][j] == "object" && JSON.stringify(this.objDataAll[website][id][j]) == "[null]"){
							continue;
						}
						if((j == "facebook" || j == "twitter") && this.objDataAll[website][id][j] == ""){
							continue;
						}
						if((j == "hide" || j == "ignore") && this.objDataAll[website][id][j] == false){
							continue;
						}
						if(j == "notifyOnline" && this.objDataAll[website][id][j] == getPreference("notify_online")){
							continue;
						}
						if(j == "notifyOffline" && this.objDataAll[website][id][j] == getPreference("notify_offline")){
							continue;
						}
						if(typeof this.objDataAll[website][id][j] == "boolean"){
							filters = filters + " " + j + "::" + this.objDataAll[website][id][j];
						}
						if(j == "facebook" || j == "twitter"){
							filters = filters + " " + j + "::" + encodeString(this.objDataAll[website][id][j]);
						} else {
							for(let k in this.objDataAll[website][id][j]){
								filters = filters + " " + j + "::" + encodeString(this.objDataAll[website][id][j][k]);
							}
						}
					}
				}
				
				let URL = (typeof this.objDataAll[website][id].streamURL != "undefined" && this.objDataAll[website][id].streamURL != "")? (" " + this.objDataAll[website][id].streamURL) : "";
				
				array.push(`${website}::${id}${filters}${URL}`);
			}
		}
		let newSettings = array.join(", ");
		savePreference("stream_keys_list", newSettings);
		setIcon();
		console.log(`Stream key list update: ${getPreference("stream_keys_list")}`);
	}
}

function getStreamURL(website, id, contentId, usePrefUrl){
	var streamList = (new streamListFromSetting(website)).objData;
	
	let streamData = liveStatus[website][id][contentId];
	
	if(id in streamList){
		if(streamList[id].streamURL != "" && usePrefUrl == true){
			return streamList[id].streamURL;
		} else {
			if(typeof liveStatus[website][id][contentId] != "undefined"){
				if(typeof streamData.streamURL == "string" && streamData.streamURL != ""){
					return streamData.streamURL;
				}
			}
			if(typeof channelInfos[website][id] != "undefined"){
				if(typeof channelInfos[website][id].streamURL == "string" && channelInfos.streamURL != ""){
						return channelInfos[website][id].streamURL
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
	contentURL: self.data.url("panel.html"),
});

function refreshPanel(data){
	updatePanelData();
}
function refreshStreamsFromPanel(){
	checkLives();
	updatePanelData();
	function waitToUpdatePanel(){
		updatePanelData();
	}
	setTimeout(waitToUpdatePanel, 5000);
}

const addStream_URLpatterns = {"dailymotion": [/^(?:http|https):\/\/games\.dailymotion\.com\/(?:live|video)\/([a-zA-Z0-9]+).*$/, /^(?:http|https):\/\/www\.dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+).*$/, /^(?:http|https):\/\/games\.dailymotion\.com\/[^\/]+\/v\/([a-zA-Z0-9]+).*$/],
		"channel::dailymotion": [/^(?:http|https):\/\/(?:games\.|www\.)dailymotion\.com\/user\/([^\s\t\/]+).*$/, /^(?:http|https):\/\/(?:games\.|www\.)dailymotion\.com\/(?!user\/|monetization\/|archived\/|fr\/|en\/|legal\/|stream|rss)([^\s\t\/]+).*$/],
		"hitbox": [/^(?:http|https):\/\/www\.hitbox\.tv\/(?:embedchat\/)?([^\/\?\&]+).*$/],
		"twitch": [/^(?:http|https):\/\/www\.twitch\.tv\/([^\/\?\&]+).*$/,/^(?:http|https):\/\/player\.twitch\.tv\/\?channel\=([\w\-]+).*$/],
		"beam": [/^(?:http|https):\/\/beam\.pro\/([^\/\?\&]+)/]
	};
let URLContext_Array = new Array();
for(website in addStream_URLpatterns){
	URLContext_Array = URLContext_Array.concat(addStream_URLpatterns[website]);
}
ContextMenu.Item({
	label: _("Add this"),
	image: self.data.url("../icon.png"),
	context: [
		ContextMenu.SelectorContext("a[href]"),
		ContextMenu.PredicateContext(function(context){
				for(let i in URLContext_Array){
					console.warn(URLContext_Array[i].test(context.linkURL));
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
let addStreamFromPanel_pageListener = new Array();
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
		} else if(data.hasOwnProperty("embed_list")){
			console.log("[Live notifier] AddStream - Embed list");
			url_list = data.embed_list;
			for(i of addStreamFromPanel_pageListener){
				i.port.removeListener("addStream", addStreamFromPanel);
			}
			type = "embed";
		}
	} else {
		console.info("Current active tab: " + active_tab_url);
		url_list = [active_tab_url];
	}
	for(let url of url_list){
		for(source_website in addStream_URLpatterns){
			let website = source_website;
			if(website_channel_id.test(source_website)){
				website = website_channel_id.exec(source_website)[1];
			}
			
			let streamListSetting = new streamListFromSetting(website);
			let streamList = streamListSetting.objData;
			for(let pattern of addStream_URLpatterns[source_website]){
				let id = "";
				if(pattern.test(url)){
					id = pattern.exec(url)[1];
					if(streamListSetting.streamExist(website, id)){
						doNotif("Live notifier",`${display_id(id)} ${_("is already configured.")}`);
						return true;
					} else {
						let id_toChecked = id;
						let current_API = websites[website].API(id);
						
						if(website_channel_id.test(source_website)){
							current_API = websites[website].API_channelInfos(`channel::${id}`);
						}
						
						Request({
							url: current_API.url,
							overrideMimeType: current_API.overrideMimeType,
							onComplete: function (response) {
								let id = id_toChecked;
								data = response.json;
								
								console.group();
								console.info(`${website} - ${response.url}`);
								console.dir(data);
								console.groupEnd();
								
								if(isValidResponse(website, data) == false){
									if(website == "dailymotion" && (website_channel_id.test(source_website) || data.mode == "vod")){
										let username = (data.mode == "vod")? data["user.username"] : data.username;
										let id_username = `channel::${username}`;
										let id_owner = `channel::${(data.mode == "vod")? data.owner : data.id}`;
										
										// Use username (login) as channel id
										id = id_username;
										if(streamListSetting.streamExist(website, id_username) || streamListSetting.streamExist(website, id_owner)){
											doNotif("Live notifier",`${display_id(id)} ${_("is already configured.")}`);
											return true;
										}
									} else {
										doNotif("Live notifier", `${display_id(id)} ${_("wasnt configured but not detected as channel")}`);
										return null;
									}
								}
								if(getPreference("confirm_addStreamFromPanel")){
									let addstreamNotifAction = new notifAction("addStream", {id: id, website: website, url: ((type == "embed")? active_tab_url : "")});
									doActionNotif(`Live notifier (${_("click to confirm")})`, `${display_id(id)} ${_("wasn't configured, and can be added.")}`, addstreamNotifAction);
								} else {
									streamListSetting.addStream(website, id, ((type == "embed")? active_tab_url : ""));
									streamListSetting.update();
									doNotif("Live notifier", `${display_id(id)} ${_("wasn't configured, and have been added.")}`);
									// Update the panel for the new stream added
									setTimeout(function(){
										refreshPanel();
									}, 5000);
								}
							}
						}).get();
						return true;
					}
				}
			}
		}
	}
	if(typeof data != "object" && type != "ContextMenu"){
		if(!data.hasOwnProperty("embed_list")){
			let page_port = current_tab.attach({
				contentScriptFile: self.data.url("js/page_getEmbedList.js")
			});
			addStreamFromPanel_pageListener.push(page_port);
			page_port.port.on("addStream", addStreamFromPanel);
		}
	} else {
		doNotif("Live notifier", _("No supported stream detected in the current tab, so, nothing to add."));
	}
}
function deleteStreamFromPanel(data){
	let streamListSetting = new streamListFromSetting(data.website);
	let streamList = streamListSetting.objData;
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
	
	let streamList = (new streamListFromSetting(website)).objData;
	
	let streamData = liveStatus[website][id][contentId];
	let streamName = streamData.streamName;
	let streamURL = getStreamURL(website, id, contentId, true);
	let streamStatus = streamData.streamStatus;
	
	let facebookID = (typeof streamList[id].facebook == "string" && streamList[id].facebook != "")? streamList[id].facebook : streamData.twitterID;
	let twitterID = (typeof streamList[id].twitter == "string" && streamList[id].twitter != "")? streamList[id].twitter : streamData.twitterID;
	
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
	let streamList = streamListSetting.objData;
	
	for(let i in streamSettingsData){
		streamList[id][i] = streamSettingsData[i];
	}
	streamListSetting.update();
}


function importButton_Panel(website){
	console.info(`Importing ${website}...`);
	importButton(website);
}

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

let addon_fully_loaded = false;
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
	
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let id in liveStatus[website]){
			// Make sure that the stream from the status is still in the settings
			if(id in streamList){
				if(typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true){
					console.info(`[Live notifier - Panel] Ignoring ${id}`);
					continue;
				}
				if(typeof streamList[id].hide == "boolean" && streamList[id].hide == true){
					console.info(`[Live notifier - Panel] Hiding ${id}`);
					continue;
				}
				
				if(JSON.stringify(liveStatus[website][id]) == "{}"){
					if(typeof channelInfos[website][id] != "undefined"){
						let streamData = channelInfos[website][id];
						let contentId = id;
						
						//console.info(`No data found, using channel infos: ${id} (${website})`);
						
						let streamInfo = {
							id: id,
							type: "channel",
							contentId: contentId,
							online: streamData.online,
							website: website,
							streamName: streamData.streamName,
							streamStatus: streamData.streamStatus,
							streamGame: streamData.streamGame,
							streamOwnerLogo: streamData.streamOwnerLogo,
							streamCategoryLogo: streamData.streamCategoryLogo,
							streamCurrentViewers: streamData.streamCurrentViewers,
							streamUrl: getStreamURL(website, id, contentId, true),
							facebookID: streamData.facebookID,
							twitterID: streamData.twitterID
						}
						streamInfo.streamSettings = streamList[id];
						
						panel.port.emit("updateData", streamInfo);
					}
				} else {
					for(let contentId in liveStatus[website][id]){
						let streamData = liveStatus[website][id][contentId];
						
						getCleanedStreamStatus(website, id, contentId, streamList[id], streamData.online);
						
						if(streamData.online_cleaned || (getPreference("show_offline_in_panel") && !streamData.online_cleaned)){
							let streamInfo = {
								id: id,
								type: "live",
								contentId: contentId,
								online: streamData.online_cleaned,
								website: website,
								streamName: streamData.streamName,
								streamStatus: streamData.streamStatus,
								streamGame: streamData.streamGame,
								streamOwnerLogo: streamData.streamOwnerLogo,
								streamCategoryLogo: streamData.streamCategoryLogo,
								streamCurrentViewers: streamData.streamCurrentViewers,
								streamUrl: getStreamURL(website, id, contentId, true),
								facebookID: streamData.facebookID,
								twitterID: streamData.twitterID
							}
							streamInfo.streamSettings = streamList[id];
							
							doStreamNotif(website, id, contentId, streamList[id]);
							panel.port.emit("updateData", streamInfo);
						}
					}
				}
			} else {
				delete liveStatus[website][id];
				console.info(`${id} from ${website} was already deleted but not from liveStatus`);
			}
		}
	}
	let notCheckedYet = false;
	for(let website in websites){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let id in streamList){
			if(!(id in liveStatus[website])){
				notCheckedYet = true;
				console.info(`${id} from ${website} is not checked yet`);
				try{
					getPrimary(id, website, id);
				}
				catch(error){
					console.warn(`[Live notifier] ${error}`);
				}
			}
		}
	}
	if(notCheckedYet == true){
		setTimeout(function(){
			refreshPanel();
		}, 5000);
	}
	setIcon();
	
	//Update online steam count in the panel
	panel.port.emit("updateOnlineCount", (firefox_button.state("window").badge == 0)? _("No stream online") :  _("%d stream(s) online",firefox_button.state("window").badge));
	
	if(getPreference("show_offline_in_panel")){
		var offlineCount = getOfflineCount();
		panel.port.emit("updateOfflineCount", (offlineCount == 0)? _("No stream offline") :  _("%d stream(s) offline",offlineCount));
	} else {
		panel.port.emit("updateOfflineCount", "");
	}
	
	let updateSettings = [
		"dailymotion_user_id",
		"hitbox_user_id",
		"twitch_user_id",
		"beam_user_id",
		"check_delay",
		"notify_online",
		"notify_offline",
		"statusBlacklist",
		"statusWhitelist",
		"gameBlacklist",
		"gameWhitelist",
		"group_streams_by_websites",
		"show_offline_in_panel",
		"confirm_addStreamFromPanel",
		"confirm_deleteStreamFromPanel",
		"livestreamer_cmd_to_clipboard",
		"livestreamer_cmd_quality"
	];
	for(let i in updateSettings){
		panel.port.emit("settingNodesUpdate", {settingName: updateSettings[i], settingValue: getPreference(updateSettings[i])});
	}
	
	if(current_version != ""){
		panel.port.emit("current_version", {"current_version": current_version});
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


function notifAction(type,data){
	this.type = type;
	this.data = data;
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
					void(0);
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
	let streamData = liveStatus[website][id][contentId];
	
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
	streamData.online_cleaned = isStreamOnline;
	return isStreamOnline;
}

function doStreamNotif(website, id, contentId, streamSetting){
	let streamList = (new streamListFromSetting(website)).objData;
	let streamData = liveStatus[website][id][contentId];
	
	let online = streamData.online;
	
	let streamName = streamData.streamName;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamLogo = "";
	
	if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	let isStreamOnline_cleaned = getCleanedStreamStatus(website, id, contentId, streamSetting, online);
	
	if(isStreamOnline_cleaned){
		if(((typeof streamList[id].notifyOnline == "boolean")? streamList[id].notifyOnline : getPreference("notify_online")) == true && streamData.notificationStatus == false){
			let streamStatus = ((streamData.streamStatus != "")? ": " + streamData.streamStatus : "") + ((streamData.streamGame != "")? (" (" + streamData.streamGame + ")") : "");
				if(streamLogo != ""){
					doNotifUrl(_("Stream online"), `${streamName}${streamStatus}`, getStreamURL(website, id, contentId, true), streamLogo);
				} else {
					doNotifUrl(_("Stream online"), `${streamName}${streamStatus}`, getStreamURL(website, id, contentId, true));
				}
		}
	} else {
		if(((typeof streamList[id].notifyOffline == "boolean")? streamList[id].notifyOffline : getPreference("notify_offline")) == true && streamData.notificationStatus == true){
			if(streamLogo != ""){
				doNotif(_("Stream offline"),streamName, streamLogo);
			} else {
				doNotif(_("Stream offline"),streamName);
			}
		}
	}
	streamData.notificationStatus = isStreamOnline_cleaned;
}

function getOfflineCount(){
	var offlineCount = 0;
	
	for(let website in websites){
		let streamList = (new streamListFromSetting(website)).objData;
		
		for(let id in streamList){
			if(typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true){
				// Ignoring stream with ignore set to true from online count
				//console.log(`[Live notifier - getOfflineCount] ${id} of ${website} is ignored`);
				continue;
			}
			
			if(id in liveStatus[website]){
				if(JSON.stringify(liveStatus[website][id]) == "{}"){
					offlineCount = offlineCount + 1;
				} else {
					for(let contentId in liveStatus[website][id]){
						if(!liveStatus[website][id][contentId].online_cleaned && streamList.hasOwnProperty(id)){
							offlineCount = offlineCount + 1;
						}
					}
				}
			}
		}
	}
	return offlineCount;
}

//Changement de l'icone
function setIcon() {
	var onlineCount = 0;
	
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let id in liveStatus[website]){
			if(id in streamList && (typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true)){
				// Ignoring stream with ignore set to true from online count
				//console.log(`[Live notifier - setIcon] ${id} of ${website} is ignored`);
				continue;
			} else {
				for(let contentId in liveStatus[website][id]){
					if(liveStatus[website][id][contentId].online_cleaned && streamList.hasOwnProperty(id)){
						onlineCount = onlineCount + 1;
					}
				}
			}
		}
	}
	
	if (onlineCount > 0){
		firefox_button.state("window", {
			"label": _("%d stream(s) online",onlineCount),
			"icon": myIconURL_online,
			badge: onlineCount,
			badgeColor: ""
		});
	} else {
		firefox_button.state("window", {
			"label": _("No stream online"),
			"icon": myIconURL_offline,
			badge: onlineCount,
			badgeColor: "#424242"
		});
	}
};

const website_channel_id = /channel\:\:(.*)/,
	facebookID_from_url = /(?:http|https):\/\/(?:www\.)?facebook.com\/([^\/]+)(?:\/.*)?/,
	twitterID_from_url = /(?:http|https):\/\/(?:www\.)?twitter.com\/([^\/]+)(?:\/.*)?/;

function isValidResponse(website, data){
	if(data == null || typeof data != "object" || JSON.stringify == "{}"){
		console.warn("Unable to get stream state (no connection).");
		return false;
	}
	let state = websites[website].isValidResponse(data);
	switch(state){
		case "error":
			console.warn(`[${website}] Unable to get stream state (error detected).`);
			return false;
			break;
		case "notstream":
			console.warn(`[${website}] Unable to get stream state (not a stream).`);
			return false;
			break;
		case "":
		case "success":
			return true
		default:
			console.warn(`[${website}] Unknown validation state (${state}).`);
			return true;
			break;
	}
	
	return true;
}

/*
let checkingLives_processState = {data: {},checked: null, totalwebsites: null, total: null};
function checkLiveEnd(){
	let checked = checkingLives_processState.checked;
	let totalwebsites = checkingLives_processState.totalwebsites;
	let total = checkingLives_processState.total;
	
	let data = checkingLives_processState.data;
	for(let website in data){
		for(let id in data){
			if(data[website][id] == 0){
				delete data[website][id];
			}
		}
		if(JSON.stringify(data[website]) == "{}"){
			delete data[website];
		}
	}
	if(totalwebsites == websites.length && JSON.stringify(data) == "{}"){
		for(let website in websites){
			var streamList = (new streamListFromSetting(website)).objData;
			for(let id in liveStatus[website]){
				if(id in streamList && (typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true)){
					console.info("[Live notifier] Live check end");
					//doStreamNotif(website, id, streamList[id].contentId, streamList[id].streamSetting);
				}
			}
		}
	}
}*/
function checkLives(){
	console.group();
	
	//checkingLives_processState.data = {};
	//checkingLives_processState.checked = 0;
	//checkingLives_processState.total = 0;
	
	for(let website in websites){
		let streamList = (new streamListFromSetting(website)).objData;
		
		//checkingLives_processState.totalwebsites += streamList.totalwebsites + 1;
		//checkingLives_processState.total += streamList.length;
		
		console.group();
		console.info(website);
		console.dir(streamList);
		console.groupEnd();
		
		for(let id in streamList){
			/*if(typeof checkingLives_processState.data[website] == "undefined"){
				checkingLives_processState.data[website] = {};
			}
			checkingLives_processState.data[website][id] = 0;*/
			
			if(typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true){
				//console.info(`Ignoring ${id}`);
				continue;
			}
			getPrimary(id, website, streamList[id]);
		}
	}
	
	console.groupEnd();
	
	clearInterval(interval);
	interval = setInterval(checkLives, getPreference('check_delay') * 60000);
}


function getPrimary(id, website, streamSetting, url, pageNumber){
	let current_API = websites[website].API(id);
	if(typeof url == "string"){
		current_API.url = url;
	}
	
	console.time(`${website}::${id}`);
	
	Request_Get({
		url: current_API.url,
		overrideMimeType: current_API.overrideMimeType,
		onComplete: function (response) {
			let data = response.json;
			
			console.group();
			console.info(`${website} - ${id} (${response.url})`);
			console.dir(data);
			
			if(typeof liveStatus[website][id] == "undefined"){
				liveStatus[website][id] = {};
			}
			
			if(website_channel_id.test(id) == true){
				if(isValidResponse(website, data) == true){
					let streamListData;
					if(typeof pageNumber == "number"){
						streamListData = websites[website].channelList(id, website, data, pageNumber);
					} else {
						streamListData = websites[website].channelList(id, website, data);
					}
					
					if(JSON.stringify(streamListData.streamList) == "{}"){
						getChannelInfo(website, id);
						channelListEnd(website, id);
					} else {
						for(let i in streamListData.streamList){
							let contentId = i;
							//checkingLives_processState.data[website][id] += 1;
							processPrimary(id, contentId, website, streamSetting, streamListData.streamList[i]);
						}
						if(streamListData.hasOwnProperty("next") == true){
							if(streamListData.next == null){
								channelListEnd(website, id);
							} else {
								getPrimary(id, website, streamSetting, streamListData.url, streamListData.next_page_number);
							}
						}
					}
				} else {
					channelListEnd(website, id);
				}
			} else {
				processPrimary(id, id, website, streamSetting, data);
				//checkingLives_processState.data[website][id] = 1;
			}
		}
	});
}

function channelListEnd(website, id){
	setIcon();
	console.timeEnd(`${website}::${id}`);
	console.groupEnd();
}

function processPrimary(id, contentId, website, streamSetting, data){
	if(typeof liveStatus[website][id][contentId] == "undefined"){
		let defaultStatus = liveStatus[website][id][contentId] = {"online": false, "notificationStatus": false, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
	}
	if(isValidResponse(website, data) == true){
		let liveState = websites[website].checkLiveStatus(id, contentId, data, liveStatus[website][id][contentId]);
		if(liveState !== null){
			if(websites[website].hasOwnProperty("API_second") == true){
				let second_API = websites[website].API_second(contentId);
				
				Request_Get({
					url: second_API.url,
					overrideMimeType: second_API.overrideMimeType,
					onComplete: function (response) {
						let data_second = response.json;
						
						console.info(`${website} - ${id} (${response.url})`);
						console.dir(data_second);
						
						websites[website].seconderyInfo(id, contentId, data_second, liveStatus[website][id][contentId], liveState);
						
						doStreamNotif(website, id, contentId, streamSetting, liveState);
						//checkLiveEnd();
						setIcon();
					}
				});
			} else {
				doStreamNotif(website, id, contentId, streamSetting, liveState);
				//checkLiveEnd();
			}
		} else {
			console.warn("Unable to get stream state.");
		}
	}
	setIcon();
	
	console.timeEnd(`${website}::${id}`);
	console.groupEnd();
}
function getChannelInfo(website, id){
	let channelInfos_API = websites[website].API_channelInfos(id);
	
	if(typeof channelInfos[website][id] == "undefined"){
		let defaultChannelInfos = channelInfos["dailymotion"][id] = {"online": false, "notificationStatus": false, "streamName": (website_channel_id.test(id) == true)? website_channel_id.exec(id)[1] : id, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
	}
	if(websites[website].hasOwnProperty("API_second") == true){
		Request_Get({
			url: channelInfos_API.url,
			overrideMimeType: channelInfos_API.overrideMimeType,
			onComplete: function (response) {
				let data_channelInfos = response.json;
				
				console.info(`${website} - ${id} (${response.url})`);
				console.dir(data_channelInfos);
				
				if(isValidResponse(website, data_channelInfos) == true){
					websites[website].channelInfosProcess(id, data_channelInfos, channelInfos[website][id]);
				}
			}
		});
	}
}

function importButton(website){
	if(website == "beam"){
		Request_Get({
			url: `https://beam.pro/api/v1/channels/${getPreference(`${website}_user_id`)}`,
			overrideMimeType: "text/plain; charset=utf-8",
			onComplete: function (response) {
				let data = response.json;
				
				if(!isValidResponse(website, data)){
					console.warn(`Sometimes bad things just happen - ${website} - https://beam.pro/api/v1/channels/${getPreference(`${website}_user_id`)}`);
					doNotif("Live notifier", _("beam import error"));
				} else {
					console.group();
					console.info(`${website} - https://beam.pro/api/v1/channels/${getPreference(`${website}_user_id`)}`);
					console.dir(data);
					
					let numerical_id = data.user.id;
					
					console.groupEnd();
					
					importStreams(website, numerical_id);
				}
			}
		});
	} else {
		importStreams(website, getPreference(`${website}_user_id`));
	}
}
function importStreams(website, id, url, pageNumber){
	let current_API = websites[website].importAPI(id);
	if(typeof url == "string" && url != ""){
		current_API.url = url;
	} else {
		console.time(`${website}::${id}`);
	}
	Request_Get({
		url: current_API.url,
		overrideMimeType: current_API.overrideMimeType,
		onComplete: function (response) {
			let data = response.json;
			
			console.group();
			console.info(`${website} - ${id} (${current_API.url})`);
			console.dir(data);
			
			let streamListSetting = new streamListFromSetting(website);
			let streamList = streamListSetting.objData;
			
			let importStreamList_Data;
			if(typeof pageNumber == "number"){
				importStreamList_Data = websites[website].importStreamWebsites(id, data, streamListSetting, pageNumber);
			} else {
				importStreamList_Data = websites[website].importStreamWebsites(id, data, streamListSetting);
			}
			
			
			for(let id of importStreamList_Data.list){
				streamListSetting.addStream(website, id, "");
			}
			streamListSetting.update();
			
			if(importStreamList_Data.hasOwnProperty("next") == true && importStreamList_Data.next != null){
				if(importStreamList_Data.next.hasOwnProperty("pageNumber") == true){
					importStreams(website, id, importStreamList_Data.next.url, importStreamList_Data.next.pageNumber);
				} else {
					importStreams(website, id, importStreamList_Data.next.url);
				}
			} else {
				importStreamsEnd(website, id);
			}
			
			console.groupEnd();
			setTimeout(function(){
				refreshPanel(false);
			}, 5000);
		}
	});
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
checkLives();

function windowsFocusChange(window){
	console.log("[Live notifier] Active window change: icon update");
	setIcon();
}
windows.on('activate', windowsFocusChange);

let current_version = self.version;
let loadReason = "unknown";
exports.main = function(options, callbacks){
	// Checking if updated
	loadReason = options.loadReason;
	console.info(`Load reason: ${loadReason}`);
	if(loadReason == "upgrade"){
		doNotif("Live notifier", _("Addon have been updated (version %d)", current_version));
	}
}

exports.onUnload = function (reason) {
	try{
		clearInterval(interval);
		//panel.port.emit('unloadListeners', "");
		sp.removeListener("check_delay", check_delay_onChange);
		panel.port.removeListener("refreshPanel", refreshPanel);
		panel.port.removeListener("importStreams", importButton_Panel);
		panel.port.removeListener('refreshStreams', refreshStreamsFromPanel);
		panel.port.removeListener("addStream", addStreamFromPanel);
		panel.port.removeListener("deleteStream", deleteStreamFromPanel);
		panel.port.removeListener("openTab", openTabIfNotExist);
		sp.removeListener("twitch_import", importTwitchButton);
		windows.removeListener("activate", windowsFocusChange);
	}
	catch(err){
		console.warn(err);
	}
}

// Avoid panel data update before this variable
addon_fully_loaded = true;
