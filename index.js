// Required SDK

var { ToggleButton } = require('sdk/ui/button/toggle');
var panels = require("sdk/panel");

var Request = require("sdk/request").Request;

var simplePrefs = require('sdk/simple-prefs').prefs;
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var {setInterval, setTimeout, clearInterval} = require("sdk/timers");

var myIconURL128 = self.data.url("icon_128.png");
var myIconURL64 = self.data.url("icon.png");

var _ = require("sdk/l10n").get;

var websites = ["dailymotion","hitbox","twitch"];
var liveStatus = {};
for(i in websites){
	liveStatus[websites[i]] = {};
}

function makeSettingObjectFromString(txt){
	var obj={};
	var myTable = txt.split(",");
	var reg= /\s*([^\s]+)\s*(.*)/;
	var reg_removeSpaces= /\s*([^\s]+)\s*/;
	if(myTable.length != 0){
		for(i in myTable){
			if(reg.test(myTable[i])){
				var result=reg.exec(myTable[i]);
				obj[result[1]]=result[2];
			} else {
				let somethingElseThanSpaces = /[^\s]+/;
				if(somethingElseThanSpaces.test(myTable[i]) == true){
					obj[reg_removeSpaces.exec(myTable[i])[1]]="";
				}
			}
		}
	}
	return obj;
}

function getStreamList(website){
	var somethingElseThanSpaces = /[^\s]+/;
	switch(website){
		case "dailymotion":
			var pref = simplePrefs['dailymotion_keys_list'];
			break;
		case "hitbox":
			var pref = simplePrefs['hitbox_keys_list'];
			break;
		case "twitch":
			var pref = simplePrefs['twitch_keys_list'];
			break;
		default:
			return {};
			break;
	}
	if(pref.length == 0 || somethingElseThanSpaces.test(pref) == false){
		return {};
	} else {
		return makeSettingObjectFromString(pref);
	}
}

function getStreamURL(website,id){
	var streamList = getStreamList(website);
	if(streamList[id] != ""){
		return streamList[id];
	} else {
		if(typeof liveStatus[website][id].streamURL == "string" && liveStatus[website][id].streamURL != ""){
			return liveStatus[website][id].streamURL;
		} else {
			switch(website){
				case "dailymotion":
					return "http://www.dailymotion.com/video/" + id;
					break;
				case "hitbox":
					return "http://www.hitbox.tv/" + id;
					break;
				case "twitch":
					return "http://www.twitch.tv/" + id;
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
	icon: { 
		"16": "./live_offline_16.png",
		"32": "./live_offline_32.png",
		"64": "./live_offline.png",
		"64": "./icon.png"
	},
	badge: "",
	onClick: handleChange
});

var panel = panels.Panel({
	height: 350,
	width: 275,
	contentScriptFile: require("sdk/self").data.url("panel_contentScriptFile.js"),
	contentURL: self.data.url("panel.html"),
});

function refreshStreamsFromPanel(){
	checkLives();
	updatePanelData();
	function waitToUpdatePanel(){
		updatePanelData();
		clearInterval(intervalRefreshPanel);
	}
	var intervalRefreshPanel = setInterval(waitToUpdatePanel, 5000);
}
let addStreamFromPanel_pageListener = new Array();
function addStreamFromPanel(embed_list){
	let current_tab = tabs.activeTab;
	let active_tab_url = current_tab.url;
	console.info("Current active tab: " + active_tab_url);
	let active_tab_title = current_tab.title;
	let type;
	let patterns = {"dailymotion": [/^(?:http|https):\/\/games\.dailymotion\.com\/live\/([a-zA-Z0-9]*).*$/, /^(?:http|https):\/\/www\.dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]*).*$/],
					"hitbox": [/^(?:http|https):\/\/www\.hitbox\.tv\/(?:embedchat\/)?([^\/\?\&]*).*$/],
					"twitch": [/^(?:http|https):\/\/www\.twitch\.tv\/([^\/\?\&]*).*$/,/^(?:http|https):\/\/player\.twitch\.tv\/\?channel\=([\w\-]*).*$/]};
	let url_list;
	if(typeof embed_list == "object"){
		url_list = embed_list;
		for(i of addStreamFromPanel_pageListener){
			i.port.removeListener('refreshStreams', refreshStreamsFromPanel);
		}
		type = "embed";
	} else {
		url_list = [active_tab_url];
	}
	for(let url of url_list){
		for(website in patterns){
			var streamList = getStreamList(website);
			for(let pattern of patterns[website]){
				let id = "";
				if(pattern.test(url)){
					id = pattern.exec(url)[1];
					var existingStream = false;
					for(i in streamList){
						if(i.toLowerCase() == id.toLowerCase()){
							existingStream = true;
						}
					}
					if(existingStream){
						doNotif("Stream Notifier",`${id} ${_("is already configured.")}`);
						return true;
					} else {
						let id_toChecked = id;
						let current_API = new API(website, id);
						Request({
							url: current_API.url,
							overrideMimeType: current_API.overrideMimeType,
							onComplete: function (response) {
								let id = id_toChecked;
								data = response.json;
								if(isValidResponse(website, data) == false){
									doNotif("Stream Notifier", `${id} ${_("wasn't configured, but not detected as channel.")}`);
									return null;
								} else {
									if(simplePrefs["confirm_addStreamFromPanel"]){
										let addstreamNotifAction = new notifAction("function", function(){
											simplePrefs[website + '_keys_list'] += ((simplePrefs[website + '_keys_list'] == "")? "" : ",") + id + ((type == "embed")? " " + active_tab_url : "" );
											doNotif("Stream Notifier", `${id} ${_("have been added.")}`);
											// Update the panel for the new stream added
											refreshStreamsFromPanel();
											})
										doActionNotif(`Stream Notifier (${_("click to confirm")})`, `${id} ${_("wasn't configured, and can be added.")}`, addstreamNotifAction);
									} else {
										doNotif("Stream Notifier", `${id} ${_("wasn't configured, and have been added.")}`);
										simplePrefs[website + '_keys_list'] += ((simplePrefs[website + '_keys_list'] == "")? "" : ",") + id + ((type == "embed")? " " + active_tab_url : "" );
										// Update the panel for the new stream added
										refreshStreamsFromPanel();
									}
								}
							}
						}).get();
						return true;
					}
				}
			}
		}
	}
	if(typeof embed_list != "object"){
		let page_port = current_tab.attach({
			contentScriptFile: self.data.url("page_getEmbedList.js")
		});
		addStreamFromPanel_pageListener.push(page_port);
		page_port.port.on("addStream", addStreamFromPanel);
	} else {
		doNotif("Stream Notifier", _("No supported stream detected in the current tab, so, nothing to add."));
	}
}
panel.port.on("refreshStreams", refreshStreamsFromPanel);
panel.port.on("addStream", addStreamFromPanel);
panel.port.on("openTab", openTabIfNotExist);

function updatePanelData(){	
	if((typeof current_panel_theme != "string" && typeof current_background_color != "string") || current_panel_theme != simplePrefs["panel_theme"] || current_background_color != simplePrefs["background_color"]){
		console.log("Sending panel theme data");
		panel.port.emit("panel_theme", {"theme": simplePrefs["panel_theme"], "background_color": simplePrefs["background_color"]});
	}
	current_panel_theme = simplePrefs["panel_theme"];
	current_background_color = simplePrefs["background_color"];
	
	//Clear stream list in the panel
	panel.port.emit("initList", simplePrefs["show_offline_in_panel"]);
	
	//Update online steam count in the panel
	panel.port.emit("updateOnlineCount", (firefox_button.state("window").badge == 0)? _("No stream online") :  _("%d stream(s) online",firefox_button.state("window").badge) + ":");
	
	if(simplePrefs["show_offline_in_panel"]){
		var offlineCount = getOfflineCount();
		panel.port.emit("updateOfflineCount", (offlineCount == 0)? _("No stream offline") :  _("%d stream(s) offline",offlineCount) + ":");
	} else {
		panel.port.emit("updateOfflineCount", "")
	}
	
	for(website in liveStatus){
		var streamList = getStreamList(website);
		for(i in liveStatus[website]){
			if(i in streamList && (liveStatus[website][i].online || (simplePrefs["show_offline_in_panel"] && !liveStatus[website][i].online))){
				let streamInfo = {"id": i, "online": liveStatus[website][i].online, "website": website, "streamName": liveStatus[website][i].streamName, "streamStatus": liveStatus[website][i].streamStatus, "streamGame": liveStatus[website][i].streamGame, "streamOwnerLogo": liveStatus[website][i].streamOwnerLogo, "streamCategoryLogo": liveStatus[website][i].streamCategoryLogo, "streamCurrentViewers": liveStatus[website][i].streamCurrentViewers, "streamUrl": getStreamURL(website,i)}
				panel.port.emit("updateData", streamInfo);
			}
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
var notifications = require("sdk/notifications");

function openTabIfNotExist(url){
	for(let tab of tabs){
		if(tab.url.toLowerCase() == url.toLowerCase()){ // Mean the url was already opened in a tab
			tab.activate() // Show the already opened tab
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
		iconURL: ((typeof imgurl == "string" && imgurl != "")? imgurl : myIconURL128),
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

function doStreamNotif(website,id,isStreamOnline){
	let streamName = liveStatus[website][id].streamName;
	let streamOwnerLogo = liveStatus[website][id].streamOwnerLogo;
	let streamCategoryLogo = liveStatus[website][id].streamCategoryLogo;
	let streamLogo = "";

	if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	if(isStreamOnline){
		if(simplePrefs["notify_online"] && liveStatus[website][id].online == false){
			let streamStatus = liveStatus[website][id].streamStatus + ((liveStatus[website][id].streamGame != "")? (" (" + liveStatus[website][id].streamGame + ")") : "");
			if(streamStatus.length > 0 && streamStatus.length < 60){
				if(streamLogo != ""){
					doNotifUrl(_("Stream online"), streamName + ": " + streamStatus, getStreamURL(website,id), streamLogo);
				} else {
					doNotifUrl(_("Stream online"), streamName + ": " + streamStatus, getStreamURL(website,id));
				}
				
			} else {
				if(streamLogo != ""){
					doNotifUrl(_("Stream online"), streamName, getStreamURL(website,id), streamLogo);
				} else {
					doNotifUrl(_("Stream online"), streamName, getStreamURL(website,id));
				}
			}
		}
	} else {
		if(simplePrefs["notify_offline"] && liveStatus[website][id].online){
			if(streamLogo != ""){
				doNotifNoLink(_("Stream offline"),streamName, streamLogo);
			} else {
				doNotifNoLink(_("Stream offline"),streamName);
			}
		}
	}
	liveStatus[website][id].online = isStreamOnline;
}

function getOfflineCount(){
	var offlineCount = 0;
	for(website in liveStatus){
		var streamList = getStreamList(website);
		for(i in liveStatus[website]){
			if(!liveStatus[website][i].online && streamList.hasOwnProperty(i)){
				offlineCount = offlineCount + 1;
			}
		}
	}
	return offlineCount;
}

//Changement de l'icone
function setIcon() {
	var onlineCount = 0;
	
	for(website in liveStatus){
		var streamList = getStreamList(website);
		for(i in liveStatus[website]){
			if(liveStatus[website][i].online && streamList.hasOwnProperty(i)){
				onlineCount = onlineCount + 1;
			}
		}
	}
	
	if (onlineCount > 0){
		firefox_button.state("window", {
			"label": _("%d stream(s) online",onlineCount),
			"icon": {
				"16": "./live_online_16.png",
				"32": "./live_online_32.png",
				"64": "./live_online.png",
			},
			badge: onlineCount,
			badgeColor: ""
		});
	}
	else {
		firefox_button.state("window", {
			"label": _("No stream online"),
			"icon": {
				"16": "./live_offline_16.png",
				"32": "./live_offline_32.png",
				"64": "./live_offline.png",
			},
			badge: onlineCount,
			badgeColor: "#424242"
		});
	}
};

function API(website, id){
	switch(website){
		case "dailymotion":
			this.url = `https://api.dailymotion.com/video/${id}?fields=title,owner,audience,url,mode,onair?_= ${new Date().getTime()}`;
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		case "hitbox":
			this.url = `https://api.hitbox.tv/media/live/${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/streams/${id}`;
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
			if(data.mode != "live"){
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
			break;
		case "twitch":
			if(data.error == "Not Found"){
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
		let streamList = getStreamList(website);
		
		console.info(JSON.stringify(streamList));
		
		for(let id in streamList){
			let request_id = id;
			let current_API = new API(website, id);
			
			console.time(id);
			
			Request({
				url: current_API.url,
				overrideMimeType: current_API.overrideMimeType,
				onComplete: function (response) {
					let id = request_id;
					data = response.json;
					if(isValidResponse(website, data) == false){
						return null;
					}
					
					console.group();
					console.info(`${website} - ${id} (${current_API.url})`);
					console.dir(data);
					
					if(typeof liveStatus[website][id] == "undefined"){
						liveStatus[website][id] = {"online": false, "streamName": "", "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": ""};
					}
					let liveState = checkLiveStatus[website](id,data);
					if(liveState !== null){
						if(typeof seconderyInfo[website] == "function"){
							seconderyInfo[website](id,data,liveState);
						} else {
							doStreamNotif(website,id,liveState);
						}
					} else {
						console.warn("Unable to get stream state.");
					}
					
					setIcon();
					
					console.timeEnd(id);
					console.groupEnd();
				}
			}).get();
		}
	}
	
	console.groupEnd();
	
	clearInterval(interval);
	interval = setInterval(checkLives, simplePrefs['dailymotion_check_delay'] * 60000);
}

//Fonction principale : check si le live est on
checkLiveStatus = {
	"dailymotion":
		function(dailymotion_key, data){
			liveStatus["dailymotion"][dailymotion_key].streamName = data.title;
			liveStatus["dailymotion"][dailymotion_key].streamCurrentViewers = JSON.parse(data.audience);
			liveStatus["dailymotion"][dailymotion_key].streamURL = data.url;
			if(typeof data.onair == "boolean"){
				return data.onair;
			} else {
				return null;
			}
		},
	"hitbox":
		function(hitbox_key, data){
			if(typeof data["livestream"][0] == "object"){
				data = data["livestream"][0];
				liveStatus["hitbox"][hitbox_key].streamName = data["media_user_name"];
				liveStatus["hitbox"][hitbox_key].streamStatus = data["media_status"];
				liveStatus["hitbox"][hitbox_key].streamGame = data["category_name"];
				if(data["category_logo_large"] !== null){
					liveStatus["hitbox"][hitbox_key].streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_large"];
				} else if(data["category_logo_small"] !== null){
					liveStatus["hitbox"][hitbox_key].streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_small"];
				} else {
					liveStatus["hitbox"][hitbox_key].streamCategoryLogo = "";
				}
				if(data.channel["user_logo"] !== null){
					liveStatus["hitbox"][hitbox_key].streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo"];
				} else if(data["user_logo_small"] !== null){
					liveStatus["hitbox"][hitbox_key].streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo_small"];
				} else {
					liveStatus["hitbox"][hitbox_key].streamOwnerLogo = "";
				}
				if(typeof data.channel["channel_link"] == "string" && data.channel["channel_link"] != ""){
					liveStatus["hitbox"][hitbox_key].streamURL = data.channel["channel_link"];
				}
				liveStatus["hitbox"][hitbox_key].streamCurrentViewers = JSON.parse(data["media_views"]);
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
		function(twitch_key, data){
			if(data.hasOwnProperty("stream")){
				data = data["stream"];
				if(data != null){
					liveStatus["twitch"][twitch_key].streamName = data["channel"]["display_name"];
					liveStatus["twitch"][twitch_key].streamStatus = data["channel"]["status"];
					liveStatus["twitch"][twitch_key].streamGame = (data["game"] !== null && typeof data["game"] == "string")? data["game"] : "";
					if(typeof data.channel["logo"] == "string" && data.channel["logo"] != "") {
						liveStatus["twitch"][twitch_key].streamOwnerLogo = data.channel["logo"];
					}
					if(typeof data.channel["url"] == "string" && data.channel["url"] != "") {
						liveStatus["twitch"][twitch_key].streamURL = data.channel["url"];
					}
					liveStatus["twitch"][twitch_key].streamCurrentViewers = JSON.parse(data["viewers"]);
					return true;
				} else {
					if(liveStatus["twitch"][twitch_key].streamName == ""){
						liveStatus["twitch"][twitch_key].streamName = twitch_key;
					}
					return false;
				}
			} else {
				return null;
			}
		}
}
seconderyInfo = {
	"dailymotion":
		function(id,data_previous,isStreamOnline){
			let user_api_url = "https://api.dailymotion.com/video/" + id + "?fields=id,user.screenname,game.title,user.avatar_720_url";
			Request({
				url: user_api_url,
				overrideMimeType: "text/plain; charset=latin1",
				onComplete: function (response) {
					data = response.json;
					console.info("dailymotion" + " - " + id + " (" + user_api_url + ")");
					console.dir(data);
					
					if(data.hasOwnProperty("user.screenname")){
						if(isStreamOnline){
							liveStatus["dailymotion"][id].streamStatus = liveStatus["dailymotion"][id].streamName;
							liveStatus["dailymotion"][id].streamGame = (data["game.title"] !== null && typeof data["game.title"] == "string")? data["game.title"] : "";
						}
						if(typeof data["user.avatar_720_url"] == "string" && data["user.avatar_720_url"] != ""){
							liveStatus["dailymotion"][id].streamOwnerLogo = data["user.avatar_720_url"];
						}
						liveStatus["dailymotion"][id].streamName = data["user.screenname"];
					}
					
					doStreamNotif("dailymotion",id,isStreamOnline);
					setIcon();
				}
			}).get();
		}
}

// Exécution
var interval
checkLives();

exports.onUnload = function (reason) {
	clearInterval(interval);
	panel.port.removeListener('refreshStreams', refreshStreamsFromPanel);
	panel.port.removeListener("addStream",addStreamFromPanel);
	panel.port.removeListener("openTab", openTabIfNotExist);
	panel.port.emit('unloadListeners', "");
}
