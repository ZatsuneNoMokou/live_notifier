// Required SDK

let { ToggleButton } = require('sdk/ui/button/toggle');
let panels = require("sdk/panel");

let Request = require("sdk/request").Request;

let self = require("sdk/self");
let sp = require('sdk/simple-prefs');
let simplePrefs = require('sdk/simple-prefs').prefs;
let clipboard = require("sdk/clipboard");

function dailymotion_check_delay_onChange(){
	if(getPreferences("dailymotion_check_delay") <1){
		savePreference("dailymotion_check_delay") = 1;
	}
}
sp.on("dailymotion_check_delay", dailymotion_check_delay_onChange);

let tabs = require("sdk/tabs");
let windows = require("sdk/windows").browserWindows;

let ContextMenu = require("sdk/context-menu");

let {setInterval, setTimeout, clearInterval} = require("sdk/timers");

function getPreferences(prefId){
	return simplePrefs[prefId];
}
function savePreference(prefId, value){
	simplePrefs[prefId] = value;
	refreshPanel();
}

let myIconURL = self.data.url("live_offline_64.svg");
let myIconURL_16 = self.data.url("live_offline_16.svg");

let myIconURL_online = {
	"16": "./live_online_16.svg",
	"32": "./live_online_32.svg",
	"64": "./live_online_64.svg"
}


let myIconURL_offline = {
	"16": "./live_offline_16.svg",
	"32": "./live_offline_32.svg",
	"64": "./live_offline_64.svg"
}

let _ = require("sdk/l10n").get;

let websites = ["beam","dailymotion","hitbox","twitch"];
let liveStatus = {};
let channelInfos = {};
for(website of websites){
	liveStatus[website] = {};
	channelInfos[website] = {};
}

function streamListFromSetting (website){
	let somethingElseThanSpaces = /[^\s]+/;
	let pref = this.stringData = new String(getPreferences(`${website}_keys_list`));
	
	let obj = {};
	if(pref != "" && somethingElseThanSpaces.test(pref)){
		let myTable = pref.split(",");
		let reg= /\s*([^\s]+)\s*(.*)?/;
		if(myTable.length > 0){
			for(let i in myTable){
				let url = /((?:http|https):\/\/.*)\s*$/;
				let filters = /\s*(?:(\w+)\:\:(.+)\s*)/;
				let cleanEndingSpace = /(.*)\s+$/;
				
				let result=reg.exec(myTable[i]);
				let id = result[1];
				let data = result[2];
				
				obj[id] = {streamURL: ""};
				
				if(typeof data != "undefined"){
					if(url.test(data) == true){
						let url_result = url.exec(data);
						obj[id].streamURL = url_result[1];
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
							
							if(typeof obj[id][current_filter_id] == "undefined"){
								obj[id][current_filter_id] = new Array();
							}
							
							obj[id][current_filter_id].push(current_data);
							scan_string = scan_string.substring(next_pos, scan_string.length);
						}
					}
				}
			}
		}
	}
	this.objData = obj;
	this.website = website;
	
	this.streamExist = function(id){
		for(let i in this.objData){
			if(i.toLowerCase() == id.toLowerCase()){
				return true;
			}
		}
		return false;
	}
	
	this.addStream = function(id, url){
		if(this.streamExist(id) == false){
			this.objData[id] = {streamURL: url};
			console.log(`${id} has been added`);
			
			try{
				getPrimary(id, this.website, id);
			}
			catch(error){
				console.warn(`[Live notifier] ${error}`);
			}
		}
	}
	this.deleteStream = function(id){
		if(this.streamExist(id)){
			delete this.objData[id];
			console.log(`${id} has been deleted`);
		}
	}
	this.update = function(){
		let array = new Array();
		for(let id in this.objData){
			let filters = "";
			for(let j in this.objData[id]){
				if(j != "streamURL"){
					filters = filters + " " + j + "::" + this.objData[id][j];
				}
			}
			
			let URL = (typeof this.objData[id].streamURL != "undefined")? (" " + this.objData[id].streamURL) : "";
			
			array.push(`${id}${filters}${URL}`);
		}
		let newSettings = array.join(",");
		savePreference(`${this.website}_keys_list`, newSettings);
		console.log(`New settings (${this.website}): ${getPreferences(`${this.website}_keys_list`)}`);
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

//Définition du bouton icon: self.data.url("logo.svg")
var firefox_button = ToggleButton({
	id: "streamnotifier_button",
	label: _("Stream offline"),
	icon: myIconURL_offline,
	badge: "",
	onClick: handleChange
});

var panel = panels.Panel({
	height: 350,
	width: 285,
	contentScriptFile: require("sdk/self").data.url("panel_contentScriptFile.js"),
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

let addStream_URLpatterns = {"dailymotion": [/^(?:http|https):\/\/games\.dailymotion\.com\/(?:live|video)\/([a-zA-Z0-9]+).*$/, /^(?:http|https):\/\/www\.dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+).*$/, /^(?:http|https):\/\/games\.dailymotion\.com\/[^\/]+\/v\/([a-zA-Z0-9]+).*$/],
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
		ContextMenu.URLContext(URLContext_Array),
		ContextMenu.SelectorContext("a[href]")
	],
	contentScriptFile: self.data.url("page_getUrlLink.js"),
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
					if(streamListSetting.streamExist(id)){
						doNotif("Live Notifier",`${display_id(id)} ${_("is already configured.")}`);
						return true;
					} else {
						let id_toChecked = id;
						let current_API = new API(website, id);
						
						if(website_channel_id.test(source_website)){
							current_API = new API_channelInfos(website, `channel::${id}`);
						}
						
						Request({
							url: current_API.url,
							overrideMimeType: current_API.overrideMimeType,
							onComplete: function (response) {
								let id = id_toChecked;
								data = response.json;
								
								console.group()
								console.info(`${website} - ${current_API.url}`);
								console.dir(data);
								console.groupEnd();
								
								if(isValidResponse(website, data) == false){
									if(website == "dailymotion" && (website_channel_id.test(source_website) || data.mode == "vod")){
										let username = (data.mode == "vod")? data["user.username"] : data.username;
										let id_username = `channel::${username}`;
										let id_owner = `channel::${(data.mode == "vod")? data.owner : data.id}`;
										
										// Use username (login) as channel id
										id = id_username;
										if(streamListSetting.streamExist(id_username) || streamListSetting.streamExist(id_owner)){
											doNotif("Live notifier",`${display_id(id)} ${_("is already configured.")}`);
											return true;
										}
									} else {
										doNotif("Live notifier", `${display_id(id)} ${_("wasnt configured but not detected as channel")}`);
										return null;
									}
								}
								if(getPreferences("confirm_addStreamFromPanel")){
									let addstreamNotifAction = new notifAction("function", function(){
										streamListSetting.addStream(id, ((type == "embed")? active_tab_url : ""));
										streamListSetting.update();
										doNotif("Live Notifier", `${display_id(id)} ${_("have been added.")}`);
										// Update the panel for the new stream added
										setTimeout(function(){
											refreshPanel(false);
										}, 5000);
										})
									doActionNotif(`Stream Notifier (${_("click to confirm")})`, `${display_id(id)} ${_("wasn't configured, and can be added.")}`, addstreamNotifAction);
								} else {
									streamListSetting.addStream(id, ((type == "embed")? active_tab_url : ""));
									streamListSetting.update();
									doNotif("Live Notifier", `${display_id(id)} ${_("wasn't configured, and have been added.")}`);
									// Update the panel for the new stream added
									setTimeout(function(){
										refreshPanel(false);
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
				contentScriptFile: self.data.url("page_getEmbedList.js")
			});
			addStreamFromPanel_pageListener.push(page_port);
			page_port.port.on("addStream", addStreamFromPanel);
		}
	} else {
		doNotif("Live Notifier", _("No supported stream detected in the current tab, so, nothing to add."));
	}
}
function deleteStreamFromPanel(data){
	let streamListSetting = new streamListFromSetting(data.website);
	let streamList = streamListSetting.objData;
	let id = data.id;
	if(streamListSetting.streamExist(id)){
		if(getPreferences("confirm_deleteStreamFromPanel")){
			let deletestreamNotifAction = new notifAction("function", function(){
				delete streamListSetting.objData[id];
				streamListSetting.update();
				doNotif("Live Notifier", `${display_id(id)} ${_("has been deleted.")}`);
				// Update the panel for the new stream added
				refreshPanel();
				})
			doActionNotif(`Stream Notifier (${_("click to confirm")})`, `${display_id(id)} ${_("will be deleted, are you sure?")}`, deletestreamNotifAction);
		} else {
			delete streamListSetting.objData[id];
			streamListSetting.update();
			doNotif("Live Notifier", `${display_id(id)} ${_("has been deleted.")}`);
			// Update the panel for the new stream added
			refreshPanel();
		}
	}
}

function settingUpdate(settingName, settingValue){
	if(typeof getPreferences(settingName) == "number" && typeof settingValue == "string"){
		settingValue = parseInt(settingValue);
	}
	console.log(`${settingName} - ${settingValue}`);
	if(typeof getPreferences(settingName) != typeof settingValue){
		console.warn(`Setting (${settingName}) type: ${typeof getPreferences(settingName)} - Incoming type: ${typeof settingValue}`);
	}
	savePreference(settingName, settingValue);
}

function importButton_Panel(website){
	console.info(`Importing ${website}...`);
	importButton(website);
}

panel.port.on("refreshPanel", refreshPanel);
panel.port.on("importStreams", importButton_Panel);
panel.port.on("refreshStreams", refreshStreamsFromPanel);
panel.port.on("addStream", addStreamFromPanel);
panel.port.on("deleteStream", deleteStreamFromPanel);
panel.port.on("copyLivestreamerCmd", copyLivestreamerCmd);
panel.port.on("openOnlineLive", openOnlineLive);
panel.port.on("openTab", openTabIfNotExist);
panel.port.on("setting_Update", function(data){
	settingUpdate(data.settingName, data.settingValue);
});

function updatePanelData(){
	if((typeof current_panel_theme != "string" && typeof current_background_color != "string") || current_panel_theme != getPreferences("panel_theme") || current_background_color != getPreferences("background_color")){
		console.log("Sending panel theme data");
		panel.port.emit("panel_theme", {"theme": getPreferences("panel_theme"), "background_color": getPreferences("background_color")});
	}
	current_panel_theme = getPreferences("panel_theme");
	current_background_color = getPreferences("background_color");
	
	//Clear stream list in the panel
	panel.port.emit("initList", getPreferences("show_offline_in_panel"));
	
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let id in liveStatus[website]){
			
			if(id in streamList && JSON.stringify(liveStatus[website][id]) == "{}"){
				let streamData = channelInfos[website][id];
				let contentId = id;
				
				console.info(`No data found, using channel infos: ${id} (${website})`);
				
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
					treamCategoryLogo: streamData.streamCategoryLogo,
					streamCurrentViewers: streamData.streamCurrentViewers,
					streamUrl: getStreamURL(website, id, contentId, true)
				}
				panel.port.emit("updateData", streamInfo);
			} else {
				for(let contentId in liveStatus[website][id]){
					let streamData = liveStatus[website][id][contentId];
					
					if(id in streamList){
						getCleanedStreamStatus(website, id, contentId, streamList[id], streamData.online);
					}
					
					if(id in streamList && (streamData.online_cleaned || (getPreferences("show_offline_in_panel") && !streamData.online_cleaned))){
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
							streamUrl: getStreamURL(website, id, contentId, true)
						}
						panel.port.emit("updateData", streamInfo);
					}
				}
			}
		}
	}
	
	setIcon();
	
	//Update online steam count in the panel
	panel.port.emit("updateOnlineCount", (firefox_button.state("window").badge == 0)? _("No stream online") :  _("%d stream(s) online",firefox_button.state("window").badge) + ":");
	
	if(getPreferences("show_offline_in_panel")){
		var offlineCount = getOfflineCount();
		panel.port.emit("updateOfflineCount", (offlineCount == 0)? _("No stream offline") :  _("%d stream(s) offline",offlineCount) + ":");
	} else {
		panel.port.emit("updateOfflineCount", "");
	}
	
	let updateSettings = [
		"hitbox_user_id",
		"twitch_user_id",
		"beam_user_id",
		"dailymotion_check_delay",
		"notify_online",
		"notify_offline",
		"show_offline_in_panel",
		"confirm_addStreamFromPanel",
		"confirm_deleteStreamFromPanel",
		"livestreamer_cmd_to_clipboard",
		"livestreamer_cmd_quality"
	];
	for(let i in updateSettings){
		panel.port.emit("settingNodesUpdate", {settingName: updateSettings[i], settingValue: getPreferences(updateSettings[i])});
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
var notifications = require("sdk/notifications");

function copyLivestreamerCmd(data){
	let cmd = `livestreamer ${getStreamURL(data.website, data.id, data.contentId, false)} ${getPreferences("livestreamer_cmd_quality")}`;
	let clipboard_success = clipboard.set(cmd, "text");
	if(clipboard_success){
		doNotif("Live notifier", _("Livestreamer command copied into the clipboard"));
	}
}
function openOnlineLive(data){
	openTabIfNotExist(data.streamUrl);
	if(getPreferences("livestreamer_cmd_to_clipboard")){
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
	console.info("Notification (" + ((typeof action.type == "string")? action.type : "Unknown/No action" ) + '): "' + message + '"');
	notifications.notify({
		title: title,
		text: message,
		iconURL: ((typeof imgurl == "string" && imgurl != "")? imgurl : myIconURL),
		onClick: function(){
			switch(action.type){
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

function getCleanedStreamStatus(website, id, contentId, streamSetting, isStreamOnline){
	let streamData = liveStatus[website][id][contentId];
	
	if(streamData.streamStatus != ""){
		let lowerCase_status = (streamData.streamStatus).toLowerCase();
		if(isStreamOnline && streamSetting.statusWhitelist){
			let statusWhitelist = streamSetting.statusWhitelist;
			let whitelisted = false;
			for(let i in statusWhitelist){
				if(lowerCase_status.indexOf(statusWhitelist[i].toLowerCase()) != -1){
					whitelisted = true;
					break;
				}
			}
			if(whitelisted == false){
				isStreamOnline = false;
				console.info(`${id} current status does not contain whitelist element(s)`);
			}
		}
		if(isStreamOnline && streamSetting.statusBlacklist){
			let statusBlacklist = streamSetting.statusBlacklist;
			let blacklisted = false;
			for(let i in statusBlacklist){
				if(lowerCase_status.indexOf(statusBlacklist[i].toLowerCase()) != -1){
					blacklisted = true;
				}
			}
			if(blacklisted == true){
				isStreamOnline = false;
				console.info(`${id} current status contain blacklist element(s)`);
			}
		}
	}
	if(typeof streamData.streamGame == "string" && streamData.streamGame != ""){
		let lowerCase_streamGame = (streamData.streamGame).toLowerCase();
		if(isStreamOnline && streamSetting.gameWhitelist){
			let gameWhitelist = streamSetting.gameWhitelist;
			let whitelisted = false;
			for(let i in gameWhitelist){
				if(lowerCase_streamGame.indexOf(gameWhitelist[i].toLowerCase()) != -1){
					whitelisted = true;
					break;
				}
			}
			if(whitelisted == false){
				isStreamOnline = false;
				console.info(`${id} current game does not contain whitelist element(s)`);
			}
		}
		if(isStreamOnline && streamSetting.gameBlacklist){
			let gameBlacklist = streamSetting.gameBlacklist;
			let blacklisted = false;
			for(let i in gameBlacklist){
				if(lowerCase_streamGame.indexOf(gameBlacklist[i].toLowerCase()) != -1){
					blacklisted = true;
				}
			}
			if(blacklisted == true){
				isStreamOnline = false;
				console.info(`${id} current game contain blacklist element(s)`);
			}
		}
	}
	streamData.online_cleaned = isStreamOnline;
	return isStreamOnline;
}

function doStreamNotif(website, id, contentId, streamSetting, isStreamOnline){
	let streamData = liveStatus[website][id][contentId];
	
	let streamName = streamData.streamName;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamLogo = "";
	
	if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	let isStreamOnline_cleaned = getCleanedStreamStatus(website, id, contentId, streamSetting, isStreamOnline);
	
	if(isStreamOnline_cleaned){
		if(getPreferences("notify_online") && streamData.online_cleaned == false){
			let streamStatus = streamData.streamStatus + ((streamData.streamGame != "")? (" (" + streamData.streamGame + ")") : "");
			if(streamStatus.length > 0 && streamStatus.length < 60){
				if(streamLogo != ""){
					doNotifUrl(_("Stream online"), streamName + ": " + streamStatus, getStreamURL(website, id, contentId, true), streamLogo);
				} else {
					doNotifUrl(_("Stream online"), streamName + ": " + streamStatus, getStreamURL(website, id, contentId, true));
				}
				
			} else {
				if(streamLogo != ""){
					doNotifUrl(_("Stream online"), streamName, getStreamURL(website, id, contentId, true), streamLogo);
				} else {
					doNotifUrl(_("Stream online"), streamName, getStreamURL(website, id, contentId, true));
				}
			}
		}
	} else {
		if(getPreferences("notify_offline") && streamData.online_cleaned){
			if(streamLogo != ""){
				doNotif(_("Stream offline"),streamName, streamLogo);
			} else {
				doNotif(_("Stream offline"),streamName);
			}
		}
	}
	streamData.online = isStreamOnline;
}

function getOfflineCount(){
	var offlineCount = 0;
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let id in liveStatus[website]){
			for(let contentId in liveStatus[website][id]){
				if(!liveStatus[website][id][contentId].online_cleaned && streamList.hasOwnProperty(id)){
					offlineCount = offlineCount + 1;
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
			for(let contentId in liveStatus[website][id]){
				if(liveStatus[website][id][contentId].online_cleaned && streamList.hasOwnProperty(id)){
					onlineCount = onlineCount + 1;
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
	}
	else {
		firefox_button.state("window", {
			"label": _("No stream online"),
			"icon": myIconURL_offline,
			badge: onlineCount,
			badgeColor: "#424242"
		});
	}
};

let website_channel_id = /channel\:\:(.*)/;
function API(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "dailymotion":
			if(website_channel_id.test(id)){
				this.url = `https://api.dailymotion.com/videos?live_onair&owners=${website_channel_id.exec(id)[1]}&fields=id,title,owner,audience,url,mode,onair?_= ${new Date().getTime()}`;
			} else {
				this.url = `https://api.dailymotion.com/video/${id}?fields=title,owner,user.username,audience,url,mode,onair?_= ${new Date().getTime()}`;
			}
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		case "hitbox":
			this.url = `https://api.hitbox.tv/media/live/${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/streams/${id}`;
			this.overrideMimeType = "application/vnd.twitchtv.v3+json; charset=utf-8"; //"text/plain; charset=utf-8";
			break;
		case "beam":
			this.url = `https://beam.pro/api/v1/channels/${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
	}
}
function API_channelInfos(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "dailymotion":
			this.url = `https://api.dailymotion.com/user/${website_channel_id.exec(id)[1]}?fields=id,username,screenname,url,avatar_720_url`;
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		default:
			this.url = null;
			this.overrideMimeType = null;
	}
}
function API_second(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "dailymotion":
			this.url = `https://api.dailymotion.com/video/${id}?fields=id,user.screenname,game.title,user.avatar_720_url`;
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/users/${id}`;
			this.overrideMimeType = "application/vnd.twitchtv.v3+json; charset=utf-8"; //"text/plain; charset=utf-8";
			break;
		default:
			this.url = null;
			this.overrideMimeType = null;
	}
}
function importAPI(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "hitbox":
			this.url = `https://api.hitbox.tv/following/user?user_name=${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/users/${id}/follows/channels`;
			this.overrideMimeType = "application/vnd.twitchtv.v3+json; charset=utf-8";
			break;
		case "beam":
			this.url = `https://beam.pro/api/v1/users/${id}/follows?limit=-1&fields=id,token`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
	}
}
function isValidResponse(website, data){
	if(data == null){
		console.warn("Unable to get stream state (no connection).");
		return false;
	}
	switch(website){
		case "dailymotion":
			if(data.mode != "live" && typeof data.list == "undefined"){
				console.warn(`[${website}] Unable to get stream state (not a stream).`);
				return false;
			}
			if(typeof data.error == "object"){
				console.warn(`[${website}] Unable to get stream state (error detected).`);
				return false;
			}
			break;
		case "hitbox":
			if(data.error == "live"){
				console.warn(`[${website}] Unable to get stream state (error detected).`);
				return false;
			}
			if(data.error == true){
				console.warn(`[${website}] Unable to get stream state (error detected).`);
				return false;
			}
			break;
		case "twitch":
			if(data.error == "Not Found"){
				console.warn(`[${website}] Unable to get stream state (error detected).`);
				return false;
			}
			break;
		case "beam":
			if(data == "Channel not found." || data.statusCode == 404){
				console.warn(`[${website}] Unable to get stream state (error detected).`);
				return false;
			}
			break;
	}
	return true;
}
function checkLives(){
	console.group();
	
	for(let i in websites){
		let website = websites[i];
		let streamList = (new streamListFromSetting(website)).objData;
		
		console.info(JSON.stringify(streamList));
		
		for(let id in streamList){
			getPrimary(id, website, streamList[id]);
		}
	}
	
	console.groupEnd();
	
	clearInterval(interval);
	interval = setInterval(checkLives, getPreferences('dailymotion_check_delay') * 60000);
}


function getPrimary(id, website, streamSetting, url, pageNumber){
	//let request_id = id;
	let current_API = new API(website, id);
	if(typeof url == "string"){
		current_API.url = url;
	}
	
	console.time(id);
	
	Request({
		url: current_API.url,
		overrideMimeType: current_API.overrideMimeType,
		onComplete: function (response) {
			let id = current_API.id;
			data = response.json;
			if(isValidResponse(website, data) == false){
				console.timeEnd(id);
				console.groupEnd();
				return null;
			}
			
			console.group();
			console.info(`${website} - ${id} (${current_API.url})`);
			console.dir(data);
			
			if(typeof liveStatus[website][id] == "undefined"){
				liveStatus[website][id] = {};
			}
			
			if(website_channel_id.test(id)){
				if(typeof pageNumber == "number"){
					pagingPrimary[website](id, website, streamSetting, data, pageNumber)
				} else {
					pagingPrimary[website](id, website, streamSetting, data)
				}
			} else {
				processPrimary(id, id, website, streamSetting, data);
			}
		}
	}).get();
}

function pagingPrimaryEnd(id){
	setIcon();
	console.timeEnd(id);
	console.groupEnd();
}
let pagingPrimary = {
	"dailymotion":
		function(id, website, streamSetting, data, pageNumber){
			let list = data.list;
			
			if(data.total == 0){
				getChannelInfo(website, id);
				pagingPrimaryEnd(id);
			} else {
				for(let i in list){
					let contentId = list[i].id;
					processPrimary(id, contentId, website, streamSetting, list[i]);
				}
				
				if(data.has_more){
					let next_url = (new API(website, website_channel_id.exec(id)[1])).url;
					let current_pageNumber = ((typeof pageNumber == "number")? pageNumber : 1);
					getPrimary(id, website, streamSetting, next_url, current_pageNumber + 1);
				} else {
					pagingPrimaryEnd(id);
				}
			}
		}
}

function processPrimary(id, contentId, website, streamSetting, data){
	if(typeof liveStatus[website][id][contentId] == "undefined"){
		liveStatus[website][id][contentId] = {"online": false, "streamName": "", "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": ""};
	}
	let liveState = checkLiveStatus[website](id, contentId, data);
	if(liveState !== null){
		//let second_API = new API_second(website, id);
		let second_API = new API_second(website, contentId);
		
		if(second_API.url !== null && second_API.overrideMimeType !== null){
			Request({
				url: second_API.url,
				overrideMimeType: second_API.overrideMimeType,
				onComplete: function (response) {
					let data_second = response.json;
					
					console.info(website + " - " + id + " (" + second_API.url + ")");
					console.dir(data_second);
					
					seconderyInfo[website](id, contentId, data_second, liveState);
					
					doStreamNotif(website, id, contentId, streamSetting, liveState);
					setIcon();
				}
			}).get();
		} else {
			doStreamNotif(website, id, contentId, streamSetting, liveState);
		}
	} else {
		console.warn("Unable to get stream state.");
	}
	
	setIcon();
	
	console.timeEnd(id);
	console.groupEnd();
}
function getChannelInfo(website, id){
	let channelInfos_API = new API_channelInfos(website, id);
	
	if(typeof channelInfos["dailymotion"][id] == "undefined"){
		channelInfos["dailymotion"][id] = {"online": false, "streamName": id, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": ""};
	}
	
	if(channelInfos_API.url !== null && channelInfos_API.overrideMimeType !== null){
		Request({
			url: channelInfos_API.url,
			overrideMimeType: channelInfos_API.overrideMimeType,
			onComplete: function (response) {
				let data_channelInfos = response.json;
				
				console.info(website + " - " + id + " (" + channelInfos_API.url + ")");
				console.dir(data_channelInfos);
				
				channelInfosProcess[website](id, data_channelInfos);
			}
		}).get();
	}
}
let channelInfosProcess = {
	"dailymotion":
		function(id, data){
			let streamData = channelInfos["dailymotion"][id];
			if(data.hasOwnProperty("screenname")){
				streamData.streamName = data["screenname"];
				streamData.streamURL = data.url;
				if(typeof data["avatar_720_url"] == "string" && data["avatar_720_url"] != ""){
					streamData.streamOwnerLogo = data["avatar_720_url"];
				}
			}
		}
}

//Fonction principale : check si le live est on
checkLiveStatus = {
	"dailymotion":
		function(id, contentId, data){
			let streamData = liveStatus["dailymotion"][id][contentId];
			streamData.streamName = data.title;
			streamData.streamCurrentViewers = JSON.parse(data.audience);
			streamData.streamURL = data.url;
			if(typeof data.onair == "boolean"){
				return data.onair;
			} else {
				return null;
			}
		},
	"hitbox":
		function(id, contentId, data){
			let streamData = liveStatus["hitbox"][id][contentId];
			if(data.hasOwnProperty("livestream") == false){
				if(data.error_msg="no_media_found"){
					streamData.online = false;
				}
				streamData.streamName = hitbox_key;
				return null;
			}
			if(typeof data["livestream"][0] == "object"){
				data = data["livestream"][0];
				streamData.streamName = data["media_user_name"];
				streamData.streamStatus = data["media_status"];
				streamData.streamGame = data["category_name"];
				if(data["category_logo_large"] !== null){
					streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_large"];
				} else if(data["category_logo_small"] !== null){
					streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_small"];
				} else {
					streamData.streamCategoryLogo = "";
				}
				if(streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv/static/img/generic/blank.gif"){
					streamData.streamCategoryLogo = "";
				}
				if(data.channel["user_logo"] !== null){
					streamData.streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo"];
				} else if(data["user_logo_small"] !== null){
					streamData.streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo_small"];
				} else {
					streamData.streamOwnerLogo = "";
				}
				if(typeof data.channel["channel_link"] == "string" && data.channel["channel_link"] != ""){
					streamData.streamURL = data.channel["channel_link"];
				}
				streamData.streamCurrentViewers = parseInt(data["media_views"]);
				if(data["media_is_live"] == "1"){
					return true;
				} else {
					return false
				}
			} else {
				return null;
			}
		},
	"twitch":
		function(id, contentId, data){
			let streamData = liveStatus["twitch"][id][contentId];
			if(data.hasOwnProperty("stream")){
				data = data["stream"];
				if(data != null){
					streamData.streamName = data["channel"]["display_name"];
					streamData.streamStatus = data["channel"]["status"];
					streamData.streamGame = (data["game"] !== null && typeof data["game"] == "string")? data["game"] : "";
					if(typeof data.channel["logo"] == "string" && data.channel["logo"] != "") {
						streamData.streamOwnerLogo = data.channel["logo"];
					}
					if(typeof data.channel["url"] == "string" && data.channel["url"] != "") {
						streamData.streamURL = data.channel["url"];
					}
					streamData.streamCurrentViewers = parseInt(data["viewers"]);
					return true;
				} else {
					if(streamData.streamName == ""){
						streamData.streamName = id;
					}
					return false;
				}
			} else {
				return null;
			}
		},
	"beam":
		function(id, contentId, data){
			let streamData = liveStatus["beam"][id][contentId];
			
			streamData.streamName = data["user"]["username"];
			streamData.streamStatus = data["name"];
			
			if(typeof data["user"]["avatarUrl"] == "string" && data["user"]["avatarUrl"] != ""){
				streamData.streamOwnerLogo = data["user"]["avatarUrl"];
			}
			streamData.streamCurrentViewers = parseInt(data["viewersCurrent"]);
			
			return data["online"];
		}
}
seconderyInfo = {
	"dailymotion":
		function(id, contentId, data, isStreamOnline){
			let streamData = liveStatus["dailymotion"][id][contentId];
			if(data.hasOwnProperty("user.screenname")){
				if(isStreamOnline){
					streamData.streamStatus = streamData.streamName;
					streamData.streamGame = (data["game.title"] !== null && typeof data["game.title"] == "string")? data["game.title"] : "";
				}
				if(typeof data["user.avatar_720_url"] == "string" && data["user.avatar_720_url"] != ""){
					streamData.streamOwnerLogo = data["user.avatar_720_url"];
				}
				streamData.streamName = data["user.screenname"];
			}
		},
	"twitch":
		function(id, contentId, data, isStreamOnline){
			let streamData = liveStatus["twitch"][id][contentId];
			if(typeof data["display_name"] == "string"){
				streamData.streamName = data["display_name"];
			}
			if(typeof data["logo"] == "string" && data["logo"] != ""){
				streamData.streamOwnerLogo = data["logo"];
			}
		}
}

function importButton(website){
	if(website == "beam"){
		Request({
			url: `https://beam.pro/api/v1/channels/${getPreferences(`${website}_user_id`)}`,
			overrideMimeType: "text/plain; charset=utf-8",
			onComplete: function (response) {
				let data = response.json;
				
				if(!isValidResponse(website, data)){
					console.warn(`Sometimes bad things just happen - ${website} - https://beam.pro/api/v1/channels/${getPreferences(`${website}_user_id`)}`);
					doNotif("Live notifier", _("beam import error"));
				} else {
					console.group();
					console.info(`${website} - https://beam.pro/api/v1/channels/${getPreferences(`${website}_user_id`)}`);
					console.dir(data);
					
					let numerical_id = data.user.id;
					
					console.groupEnd();
					
					importStreams(website, numerical_id);
				}
			}
		}).get();
	} else {
		importStreams(website, getPreferences(`${website}_user_id`));
	}
}
function importStreams(website, id, url, pageNumber){
	let current_API = new importAPI(website, id);
	if(typeof url == "string" && url != ""){
		current_API.url = url;
	} else {
		console.time(current_API.id);
	}
	Request({
		url: current_API.url,
		overrideMimeType: current_API.overrideMimeType,
		onComplete: function (response) {
			let id = current_API.id;
			let data = response.json;
			
			console.group();
			console.info(`${website} - ${id} (${current_API.url})`);
			console.dir(data);
			
			if(typeof pageNumber == "number"){
				importStreamWebsites[website](id, data, pageNumber);
			} else {
				importStreamWebsites[website](id, data);
			}
			console.groupEnd();
			setTimeout(function(){
				refreshPanel(false);
			}, 5000);
		}
	}).get();
}
function importStreamsEnd(id){
	setIcon();
	console.timeEnd(id);
}

let importStreamWebsites = {
	"twitch": function(id, data){
		let streamListSetting = new streamListFromSetting("twitch");
		let streamList = streamListSetting.objData;
		if(typeof data.follows == "object"){
			for(let item of data.follows){
				streamListSetting.addStream(item["channel"]["display_name"], "");
			}
			streamListSetting.update();
			if(data.follows.length > 0 && typeof data._links.next == "string"){
				importStreams("twitch", id, data._links.next);
			} else {
				importStreamsEnd(id);
			}
		}
	},
	"hitbox": function(id, data, pageNumber){
		let streamListSetting = new streamListFromSetting("hitbox");
		let streamList = streamListSetting.objData;
		if(typeof data.following == "object"){
			for(let item of data.following){
				streamListSetting.addStream(item["user_name"], "");
			}
			streamListSetting.update();
			if(data.following.length > 0){
				let next_url = new importAPI("hitbox", id).url;
				let current_pageNumber = ((typeof pageNumber == "number")? pageNumber : 1);
				importStreams("hitbox", id, next_url + "&offset=" + current_pageNumber, current_pageNumber + 1);
			} else {
				importStreamsEnd(id);
			}
		}
	},
	"beam": function(id, data){
		let streamListSetting = new streamListFromSetting("beam");
		let streamList = streamListSetting.objData;
		if(typeof data == "object"){
			for(let item of data){
				streamListSetting.addStream(item["token"], "");
			}
			streamListSetting.update();
		}
		importStreamsEnd(id);
	}
}
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

// Checking if updated
(function checkIfUpdated(){
	let getVersionNumbers =  /^(\d*)\.(\d*)\.(\d*)$/;
	let last_executed_version = getPreferences("livenotifier_version");
	let current_version = self.version;
	
	let last_executed_version_numbers = getVersionNumbers.exec(last_executed_version);
	let current_version_numbers = getVersionNumbers.exec(current_version);
	
	if(last_executed_version != current_version && last_executed_version != "0.0.0"){
		if(current_version_numbers.length == 4 && last_executed_version_numbers.length == 4){
			if(current_version_numbers[1] > last_executed_version_numbers[1]){
				doNotif("Live notifier", _("Addon have been updated (version %d)", current_version));
			} else if((current_version_numbers[1] == last_executed_version_numbers[1]) && (current_version_numbers[2] > last_executed_version_numbers[2])){
				doNotif("Live notifier", _("Addon have been updated (version %d)", current_version));
			} else if((current_version_numbers[1] == last_executed_version_numbers[1]) && (current_version_numbers[2] == last_executed_version_numbers[2]) && (current_version_numbers[3] > last_executed_version_numbers[3])){
				doNotif("Live notifier", _("Addon have been updated (version %d)", current_version));
			}
			savePreference("livenotifier_version", current_version);
		}
	}
})();

function windowsFocusChange(window){
	console.log("[Live notifier] Active window change: icon update");
	setIcon();
}
windows.on('activate', windowsFocusChange);


exports.onUnload = function (reason) {
	clearInterval(interval);
	sp.removeListener("dailymotion_check_delay", dailymotion_check_delay_onChange);
	panel.port.removeListener("refreshPanel", refreshPanel);
	panel.port.removeListener("importStreams", importButton_Panel);
	panel.port.removeListener('refreshStreams', refreshStreamsFromPanel);
	panel.port.removeListener("addStream", addStreamFromPanel);
	panel.port.removeListener("deleteStream", deleteStreamFromPanel);
	panel.port.removeListener("openTab", openTabIfNotExist);
	sp.removeListener("twitch_import", importTwitchButton);
	windows.removeListener("activate", windowsFocusChange);
	panel.port.emit('unloadListeners', "");
}
