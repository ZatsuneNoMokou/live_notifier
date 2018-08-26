'use strict';

const offline_badgeData = browser.runtime.getManifest().browser_action.default_icon,
	online_badgeData = {
		"16": "/data/images/live_online_16.png",
		"48": "/data/images/live_online_48.png",
		"96": "/data/images/live_online_96.png",
		"128": "/data/images/live_online_128.png"
	}
;
let myIconURL = "/data/live_offline.svg";



let websites = new Map();
appGlobal["websites"] = websites;
let websitesLoaded = new Map();
appGlobal["websitesLoaded"] = websitesLoaded;



let liveStore = new LiveStore();
appGlobal["liveStore"] = liveStore;

appGlobal["consoleMsg"] = ZDK.consoleMsg;
const consoleDir = appGlobal["consoleDir"] = ZDK.consoleDir;
const mapToObj = appGlobal["mapToObj"] = ZDK.mapToObj;
appGlobal["setTimeout"] = ZDK.setTimeout;
appGlobal["getPageSize"] = ZDK.getPageSize;
appGlobal["hasTouch"] = ZDK.hasTouch;

const streamListFromSetting = new StreamListFromSetting(true, false);
appGlobal["StreamListFromSetting"] = StreamListFromSetting;

function getStreamURL(website, id, contentId, usePrefUrl){
	streamListFromSetting.refresh();
	let streamList = streamListFromSetting.getWebsiteList(website);
	
	if(streamList.has(id)){
		if(streamList.get(id).streamURL !== "" && usePrefUrl === true){
			return streamList.get(id).streamURL;
		} else {
			if(liveStore.hasLive(website, id, contentId)){
				let streamData = liveStore.getLive(website, id, contentId);
				if(typeof streamData.streamURL === "string" && streamData.streamURL !== ""){
					return streamData.streamURL;
				}
			}
			if(liveStore.hasChannel(website, id)){
				let data = liveStore.getChannel(website, id);

				if(typeof data.streamURL === "string" && data.streamURL !== ""){
					return data.streamURL
				}
			}
			switch(website){
				case "dailymotion":
					return `http://www.dailymotion.com/video/${id}`;
				case "smashcast":
					return `http://www.smashcast.tv/${id}`;
				case "twitch":
					return `http://www.twitch.tv/${id}`;
				case "mixer":
					return `https://mixer.com/${id}`;
				case "youtube":
					if(website_channel_id.test(contentId)){
						return `https://youtube.com/channel/${website_channel_id.exec(id)[1]}`;
					} else {
						return `https://www.youtube.com/watch?v=${contentId}`;
						//return `https://youtu.be/${contentId}`;
					}
				default:
					return null;
			}
		}
	}
}
appGlobal["getStreamURL"] = getStreamURL;

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
	// let active_tab_title = current_tab.title;
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
				streamListFromSetting.refresh();


				patterns.forEach(pattern => {
					let id = "";
					if(pattern.test(url) && !pattern_found){
						pattern_found = true;
						id = pattern.exec(url)[1];
						if(streamListFromSetting.streamExist(website, id)){
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
									
									let {streamId, streamName} = websiteAPI.addStream_getId(source_website, id, response, streamListFromSetting, responseValidity);
									
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
									
									if(streamListFromSetting.streamExist(website, streamId)){
										const streamSettings = streamListFromSetting.mapDataAll.get(website).get(streamId);
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
														streamListFromSetting.refresh();
														const streamSettings = streamListFromSetting.mapDataAll.get(website).get(streamId);

														streamSettings.hide = false;
														streamSettings.ignore = false;
														streamListFromSetting.update();
													})
													.catch(err=>{
														consoleMsg("warn", err);
													})
												;
											} else {
												streamSettings.hide = false;
												streamSettings.ignore = false;
												streamListFromSetting.update();
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
													streamListFromSetting.refresh();

													const url = (type === "embed")? active_tab_url : "";

													streamListFromSetting.addStream(website, streamId, url);
													streamListFromSetting.update();
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
											streamListFromSetting.addStream(website, streamId, ((type === "embed")? active_tab_url : ""));
											streamListFromSetting.update();
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
	streamListFromSetting.refresh();

	let id = data.id;
	let website = data.website;
	if(streamListFromSetting.streamExist(website, id)){
		if(getPreference("confirm_deleteStreamFromPanel")){
			doNotif({
				"message": `${display_id(id)} ${i18ex._("will_be_deleted_are_you_sure")}`,
				"buttons": [notifButtons.deleteItem, notifButtons.cancel]
			}, true)
				.then(()=>{
					streamListFromSetting.refresh();

					streamListFromSetting.deleteStream(website, id);
					streamListFromSetting.update();
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
			streamListFromSetting.deleteStream(website, id);
			streamListFromSetting.update();
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
	
	streamListFromSetting.refresh();
	let streamList = streamListFromSetting.getWebsiteList(website);
	
	let streamData = liveStore.getLive(website, id, contentId);
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

	streamListFromSetting.refresh();

	let streamList = streamListFromSetting.getWebsiteList(website);
	
	for(let i in streamSettingsData){
		if(streamSettingsData.hasOwnProperty(i)){ // Make sure to not loop constructors
			streamList.get(id)[i] = streamSettingsData[i];
		}
	}

	streamListFromSetting.update();
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
				ZDK.openTabIfNotExist(data)
					.catch(err=>{
						consoleMsg("warn", err);
					})
				;
				break;
			case "panel_onload":
				setIcon();
				refreshPanel(data);
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

function refreshPanel(data) {
	let doUpdateTheme = false;
	if (typeof data !== "undefined") {
		if (typeof data.doUpdateTheme !== "undefined") {
			doUpdateTheme = data.doUpdateTheme;
		}
	}

	updatePanelData(doUpdateTheme);
}
function refreshStreamsFromPanel() {
	let done = () => {
		updatePanelData();
	};

	if (appGlobal["checkingLivesFinished"]) {
		checkLives()
			.then(done)
			.catch(done)
	}
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



	let streamData = liveStore.getLive(website, id, contentId);
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
	liveStore.setLive(website, id, contentId, streamData);
	return isStreamOnline;
}
appGlobal["getCleanedStreamStatus"] = getCleanedStreamStatus;

appGlobal["notificationGlobalyDisabled"] = false;
function doStreamNotif(website, id, contentId){
	streamListFromSetting.refresh();

	if(streamListFromSetting.mapDataAll.has(website)===false || streamListFromSetting.mapDataAll.get(website).has(id)===false){
		consoleMsg("warn", "Notification attempt of a stream not present in stream list.");
		return null;
	}
	const streamSettings = streamListFromSetting.mapDataAll.get(website).get(id);



	let streamData = liveStore.getLive(website, id, contentId);

	let channelData = (liveStore.hasChannel(website, id))? liveStore.getChannel(website, id) : null;

	let online = streamData.liveStatus.API_Status;
	
	let streamName = streamData.streamName;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	//let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamLogo = "";

	if(typeof streamOwnerLogo === "string" && streamOwnerLogo !== ""){
		streamLogo  = streamOwnerLogo;
	}

	let isStreamOnline_filtered = getCleanedStreamStatus(website, id, contentId, streamSettings, online);

	if(appGlobal["notificationGlobalyDisabled"] === true){
		return null;
	}

	if(isStreamOnline_filtered){
		if(streamData.liveStatus.notifiedStatus === false || streamData.startedAt!==streamData.liveStatus.startedAt){
			if((typeof streamSettings.notifyOnline === "boolean")? streamSettings.notifyOnline : getPreference("notify_online") === true){
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
					.then(()=>{
						ZDK.openTabIfNotExist(getStreamURL(website, id, contentId, true))
							.catch(err=>{
								consoleMsg("warn", err);
							})
						;
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
				) && ((typeof streamSettings.notifyVocalOnline === "boolean")? streamSettings.notifyVocalOnline : getPreference("notify_vocal_online")) === true
			){
				voiceReadMessage(i18ex._("language"), `${(typeof streamSettings.vocalStreamName === "string" && streamSettings.vocalStreamName!=="")? streamSettings.vocalStreamName : streamName} ${i18ex._("is_online")}`);
				if(channelData!==null){
					channelData.liveStatus.notifiedStatus_Vocal = isStreamOnline_filtered;
				} else {
					streamData.liveStatus.notifiedStatus_Vocal = isStreamOnline_filtered;
				}
			}
		}
	} else {
		if(streamData.liveStatus.notifiedStatus === true){
			if((typeof streamSettings.notifyOffline === "boolean")? streamSettings.notifyOffline : getPreference("notify_offline") === true){
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
				) && ((typeof streamSettings.notifyVocalOffline === "boolean")? streamSettings.notifyVocalOffline : getPreference("notify_vocal_offline")) === true
			){
				voiceReadMessage(i18ex._("language"), `${(typeof streamSettings.vocalStreamName === "string" && streamSettings.vocalStreamName!=="")? streamSettings.vocalStreamName : streamName} ${i18ex._("is_offline")}`);
				if(channelData!==null){
					channelData.liveStatus.notifiedStatus_Vocal = isStreamOnline_filtered;
				} else {
					streamData.liveStatus.notifiedStatus_Vocal = isStreamOnline_filtered;
				}
			}
		}
	}
	streamData.liveStatus.notifiedStatus = isStreamOnline_filtered;
	streamData.liveStatus.startedAt = streamData.startedAt;

	if(channelData!==null){
		liveStore.setChannel(website, id, channelData);
	}
	liveStore.setLive(website, id, contentId, streamData);
}
appGlobal["doStreamNotif"] = doStreamNotif;

function getOfflineCount(){
	let offlineCount = 0;

	streamListFromSetting.refresh();
	let streamListSetting = streamListFromSetting.mapDataAll;
	websites.forEach((websiteAPI, website) => {
		streamListSetting.get(website).forEach((streamList, id) => {
			if(typeof streamList.ignore === "boolean" && streamList.ignore === true){
				// Ignoring stream with ignore set to true from online count
				//consoleMsg("log", `[Live notifier - getOfflineCount] ${id} of ${website} is ignored`);
				return;
			}

			let liveContents = liveStore.getLive(website, id);
			if(liveStore.getLive(website, id).size === 0){
				offlineCount++;
			} else {
				liveContents.forEach(streamData=>{
					if(!streamData.liveStatus.filteredStatus){
						offlineCount++;
					}
				})
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

	streamListFromSetting.refresh();
	liveStore.forEachLive((website, id, contentId, streamData)=>{
		if(websites.has(website)===false){
			return;
		}

		let streamList = streamListFromSetting.getWebsiteList(website);
		if(streamList.has(id) && (typeof streamList.get(id).ignore === "boolean" && streamList.get(id).ignore === true)){
			// Ignoring stream with ignore set to true from online count
			//consoleMsg("log", `[Live notifier - setIcon] ${id} of ${website} is ignored`);
			//return;
		} else {
			if(streamData.liveStatus.filteredStatus && streamList.has(id)){
				appGlobal["onlineCount"] = appGlobal["onlineCount"] + 1;
				if(typeof streamList.get(id).iconIgnore !== "boolean" || streamList.get(id).iconIgnore !== true) {
					badgeOnlineCount++;
				}
			}
		}
	});

	if(badgeOnlineCount > 0){
		browser.browserAction.setTitle({title: i18ex._("count_stream_online", {"count": badgeOnlineCount})});
	} else {
		browser.browserAction.setTitle({title: i18ex._("No_stream_online")});
	}
	
	let badgeImage = (badgeOnlineCount > 0)? online_badgeData : offline_badgeData;
	if (typeof browser.browserAction.setIcon === "function") {
		if (badgeImage !== null) {
			browser.browserAction.setIcon({
				path: badgeImage
			});
		} else {
			consoleMsg("warn", "Icon(s) is/are not loaded");
		}
	}

	if (typeof browser.browserAction.setBadgeText === "function") {
		browser.browserAction.setBadgeText({text: badgeOnlineCount.toString()});
		browser.browserAction.setBadgeBackgroundColor({color: (badgeOnlineCount > 0)? "#FF0000" : "#424242"});
	}
}
appGlobal["setIcon"] = setIcon;

let website_channel_id = /channel::(.*)/;
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
		case "error-unavailable":
			consoleMsg("warn", `[${website}] Unable to get stream state (unavailable).`);
			return "error-unavailable";
		case "vod":
			consoleMsg("warn", `[${website}] Unable to get stream state (vod detected).`);
			return "vod";
		case "notstream":
			consoleMsg("warn", `[${website}] Unable to get stream state (not a stream).`);
			return "notstream";
		case "":
		case "success":
			return "success";
		default:
			consoleMsg("warn", `[${website}] Unable to get stream state (${state}).`);
			console.log(response.url);
			return state;
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

let DATAs, streamsTimings, needCheckMissing = false;
appGlobal["checkingLivesFinished"] = true;
async function checkLives(idArray){
	DATAs = new Map();
	streamsTimings = new Map();
	appGlobal["checkingLivesFinished"] = false;
	timing("checkLives");

	streamListFromSetting.refresh();

	let listToCheck;
	if(typeof idArray !== "undefined" && idArray instanceof Map){
		listToCheck = idArray;
	} else {
		listToCheck = streamListFromSetting.mapDataAll;
		consoleDir(mapToObj(streamListFromSetting.mapDataAll), "[Live Notifier] Checking lives...");
	}

	let checkQueue = new Queue(getPreference("check_limit"));



	refreshEnabledWebsites();



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

	/**
	 *
	 * @type {boolean}
	 */
	const isFullCheck = !(typeof idArray !== "undefined" && idArray instanceof Map);
	if (isFullCheck === true && interval === null) {
		interval = ZTimer.setInterval("checkLivesInterval", getPreference('check_delay'), 'm', checkLives);
	}



	if(checkQueue.queue.size === 0){
		setIcon();
		appGlobal["checkingLivesFinished"] = true;
	} else {
		let result;
		try{
			result = await checkQueue.run(
				(queueId, args)=>{ // onStreamCheckBegin
					let [id, contentId, website, streamSetting] = args;
					timing(`${website}::${id}`);
				},
				(queueId, promiseResult, args)=>{ // onStreamCheckEnd
					let id = args[0],
						contentId = args[1],
						website = args[2],
						streamSetting = args[3];

					let streamList = listToCheck.get(website).get(id);

					streamsTimings.set(`${website}::${id}`, timingEnd(`${website}::${id}`).timing);
					if((typeof promiseResult === "string" && promiseResult.indexOf("StreamChecked") !== -1) || (typeof promiseResult === "object" && JSON.stringify(promiseResult).indexOf("StreamChecked") !== -1)){
						const imgArrayPreload = [];
						liveStore.forEachLive(website, id, (website, id, contentId, streamData) => {
							if((typeof promiseResult === "string" && promiseResult.indexOf("StreamChecked") !== -1) || (typeof promiseResult === "object" && typeof promiseResult[contentId] === "string" && promiseResult[contentId].indexOf("StreamChecked") !== -1)){
								doStreamNotif(website, id, contentId);

								let streamLogo = "";
								if(streamData.online && typeof streamData.streamCategoryLogo === "string" && streamData.streamCategoryLogo !== ""){
									streamLogo  = streamData.streamCategoryLogo;
								} else if(typeof streamData.streamOwnerLogo === "string" && streamData.streamOwnerLogo !== ""){
									streamLogo  = streamData.streamOwnerLogo;
								}

								if(streamLogo!=="" && imgArrayPreload.indexOf(streamLogo)===-1){
									imgArrayPreload.push(streamLogo);
								}
							}
						})
					}
					if(liveStore.hasChannel(website, id)){
						channelListEnd(website, id);
					}
					setIcon();
				}
			);
		} catch (err){
			result = err;
		}

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

		if (isFullCheck === true) { // Only reset interval if it's a "full" check
			interval.duration = getPreference('check_delay');
			interval.init();
		}

		if(needCheckMissing){
			checkMissing();
		}

		appGlobal["checkingLivesFinished"] = true;
		return result;
	}

	if (isFullCheck === true) { // Only reset interval if it's a "full" check
		interval.duration = getPreference('check_delay');
		interval.init();
	}
}
function checkMissing(){
	if(appGlobal["checkingLivesFinished"]){
		let listToCheck = new Map();

		streamListFromSetting.refresh();
		websites.forEach((websiteAPI, website) => {
			streamListFromSetting.mapDataAll.get(website).forEach((streamList, id) => {
				if(typeof streamList.ignore === "boolean" && streamList.ignore === true){
					return;
				}
				if(!liveStore.hasLive(website, id) && !liveStore.hasChannel(website, id)){
					consoleMsg("info", `${id} from ${website} is not checked yet`);

					if(!listToCheck.has(website)){
						listToCheck.set(website, new Map())
					}

					listToCheck.get(website).set(id, streamList);
				}
			})
		});
		
		if(listToCheck.size > 0){
			checkLives(listToCheck)
				.finally(result=>{
					consoleMsg("info", (result!==undefined)? result : "Nothing");
					if(typeof panelUpdateData === "function"){
						panelUpdateData();
					}
				})
			;
		}
	} else {
		needCheckMissing = true;
	}
}
appGlobal["checkMissing"] = checkMissing;

async function getPrimary(id, contentId, website, streamSetting, nextPageToken){
	let current_API = websites.get(website).API((typeof contentId === "string" && contentId !== "")? contentId :  id, (typeof nextPageToken === "undefined" || nextPageToken === null)? null : nextPageToken);

	if(current_API===null){
		return null;
	}

	let getPrimary_RequestOptions = {
		url: current_API.url,
		overrideMimeType: current_API.overrideMimeType
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


	const response = await Request(getPrimary_RequestOptions).get(),
		data = response.json
	;


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

	if(!(typeof contentId === "string" && contentId !== "") && website_channel_id.test(id) === true){
		if(typeof nextPageToken !== "undefined" && nextPageToken !== null){
			return await processChannelList(id, website, streamSetting, response, nextPageToken);
		} else {
			await getChannelInfo(website, id);

			return await processChannelList(id, website, streamSetting, response);
		}
	} else {
		if(!(typeof contentId === "string" && contentId !== "")){
			contentId = id;
		}

		return await processPrimary(id, contentId, website, streamSetting, response);
	}
}
appGlobal["getPrimary"] = getPrimary;

async function processChannelList(id, website, streamSetting, response, nextPageToken){
	let promises = new Map();

	let data = response.json;

	if(!liveStore.hasChannel(website, id)){
		liveStore.setChannel(website, id, LiveStore.getDefaultChannel(website, id));
	}

	let responseValidity = checkResponseValidity(website, response);
	if(responseValidity === "success"){
		let streamListData;
		if(typeof nextPageToken === "undefined" || nextPageToken === null){
			// First loop
			liveStore.updateChannel(website, id, function (website, id, data) {
				data.liveStatus.liveList = new Map();
				return data;
			});

			streamListData = websites.get(website).channelList(id, website, data);
		} else {
			streamListData = websites.get(website).channelList(id, website, data, nextPageToken);
		}

		if(streamListData.hasOwnProperty("channelInfos")){
			liveStore.updateChannel(website, id, function (website, id, data) {
				for(let name in streamListData.channelInfos){
					if(streamListData.channelInfos.hasOwnProperty(name)){
						data[name] = streamListData.channelInfos[name];
					}
				}
				return data;
			});
		}

		if(!isMap(streamListData.streamList) || streamListData.streamList.size === 0){
			return ((isMap(streamListData.streamList))? "EmptyList" : "InvalidList");
		} else {
			streamListData.streamList.forEach((value, contentId) => {
				liveStore.updateChannel(website, id, function (website, id, data) {
					data.liveStatus.liveList.set(contentId, "");
					return data;
				});

				if(streamListData.hasOwnProperty("primaryRequest") && typeof streamListData.primaryRequest === "boolean" && !streamListData.primaryRequest){
					promises.set(contentId, processPrimary(id, contentId, website, streamSetting, {"json": value}));
				} else {
					if(value !== null){
						if(!liveStore.hasLive(website, id, contentId)){
							liveStore.setLive(website, id, contentId, LiveStore.getDefaultLive(website, id, contentId));
						}

						liveStore.updateLive(website, id, contentId, function (website, id, contentId, liveData) {
							for(let infoId in value){
								if(value.hasOwnProperty(infoId)){
									liveData[infoId] = value[infoId];
								}
							}
							return liveData;
						});
					}
					promises.set(contentId, getPrimary(id, contentId, website, streamSetting));
				}
			});

			if(streamListData.hasOwnProperty("nextPageToken")){
				promises.set("next", getPrimary(id, "", website, streamSetting, streamListData.nextPageToken));
			}

			return await PromiseWaitAll(promises);
		}
	} else {
		return responseValidity;
	}
}
function channelListEnd(website, id){
	liveStore.forEachLive(website, id, (website, id, contentId)=>{
		if(liveStore.getChannel(website, id).liveStatus.liveList.has(contentId) === false){
			liveStore.updateLive(website, id, contentId, function (website, id, contentId, liveData) {
				liveData.liveStatus.API_Status = false;
				return liveData;
			});

			doStreamNotif(website, id, contentId);
			liveStore.removeLive(website, id, contentId);
		}
	});
}

async function processPrimary(id, contentId, website, streamSetting, response){
	let data = response.json;
	if(!liveStore.hasLive(website, id, contentId)){
		liveStore.setLive(website, id, contentId, {"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "notifiedStatus_Vocal": false, "lastCheckStatus": ""}, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""});
	}

	let responseValidity = checkResponseValidity(website, response);
	liveStore.updateLive(website, id, contentId, function (website, id, contentId, liveData) {
		liveData.liveStatus.lastCheckStatus = responseValidity;
		return liveData;
	});
	if(responseValidity === "success"){
		let streamData = liveStore.getLive(website, id, contentId),
			channelData = liveStore.hasChannel(website, id)? liveStore.getChannel(website, id) : null
		;

		let liveState = websites.get(website).checkLiveStatus(id, contentId, data, streamData, channelData);

		liveStore.setLive(website, id, contentId, streamData);

		if(channelData!==null){
			liveStore.updateChannel(website, id, function (website, id, data) {
				data = channelData;
				return data;
			});
		}

		if(liveState !== null){
			if(typeof liveState==="string"){
				if(websites.get(website).hasOwnProperty("website_ignore") && liveState===websites.get(website).website_ignore){
					liveStore.removeLive(website, id, contentId);
					return "StreamChecked";
				} else {
					return "liveState is unexpected";
				}
			} else {
				liveStore.setLive(website, id, contentId, liveState);
			}

			if(websites.get(website).hasOwnProperty("API_second") === true){
				let second_API = websites.get(website).API_second(contentId);

				let second_API_RequestOptions = {
					url: second_API.url,
					overrideMimeType: second_API.overrideMimeType,
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

				const response = await Request(second_API_RequestOptions).get();

				let data_second = response.json;

				if(!DATAs.get(`${website}/${id}`).has(contentId)){
					DATAs.get(`${website}/${id}`).set(contentId, new Map())
				}
				DATAs.get(`${website}/${id}`).get(contentId).set("getSecond", {"url": response.url, "data": data_second});

				let responseValidity = checkResponseValidity(website, response);


				let currentLiveStatus = liveStore.getLive(website, id, contentId),
					returnString
				;

				if(responseValidity === "success"){
					let newLiveStatus = websites.get(website).seconderyInfo(id, contentId, data_second, currentLiveStatus);
					if(typeof newLiveStatus === "object" && newLiveStatus !== null){
						currentLiveStatus = newLiveStatus;
						returnString = "StreamChecked_With2ndAPI";
					} else {
						returnString = "StreamChecked";
					}
				} else {
					currentLiveStatus.liveStatus.lastCheckStatus = responseValidity;
					returnString = responseValidity;
				}

				liveStore.setLive(website, id, contentId, currentLiveStatus);
				return returnString;
			} else {
				return "StreamChecked";
				//doStreamNotif(website, id, contentId, streamSetting);
			}
		} else {
			consoleMsg("warn", "Unable to get stream state.");
			return "liveState is null";
		}
	} else {
		return responseValidity;
	}
}
async function getChannelInfo(website, id){
	if(!websites.get(website).hasOwnProperty("API_channelInfos")){
		return "NoAPI";
	}

	let channelInfos_API = websites.get(website).API_channelInfos(id);

	if(channelInfos_API===null){
		return "NoAPI";
	}

	if(!liveStore.hasChannel(website, id)){
		liveStore.setChannel(website, id, LiveStore.getDefaultChannel(website, id));
	}

	if(websites.get(website).hasOwnProperty("API_channelInfos") === true){
		let getChannelInfo_RequestOptions = {
			url: channelInfos_API.url,
			overrideMimeType: channelInfos_API.overrideMimeType
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

		const response = await Request(getChannelInfo_RequestOptions).get();

		let data_channelInfos = response.json;

		if(!DATAs.has(`${website}/${id}`)){
			DATAs.set(`${website}/${id}`, new Map());
		}
		DATAs.get(`${website}/${id}`).set("getChannelInfo", {"url": response.url, "data": data_channelInfos});

		let responseValidity = checkResponseValidity(website, response);
		liveStore.updateChannel(website, id, function (website, id, data) {
			data.liveStatus.lastCheckStatus = responseValidity;
			return data;
		});
		if(responseValidity === "success"){
			let newChannelInfos = websites.get(website).channelInfosProcess(id, data_channelInfos, liveStore.getChannel(website, id));
			if(typeof newChannelInfos === "object" && newChannelInfos !== null){
				liveStore.setChannel(website, id, newChannelInfos);
			}
		}

		return responseValidity;
	}
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
async function importStreams(website, id, url, pageNumber){
	let current_API = websites.get(website).importAPI(id);

	if(typeof url === "string" && url !== ""){
		current_API.url = url;
	} else {
		timing(`import_${website}`);
	}
	let importStreams_RequestOptions = {
		url: current_API.url,
		overrideMimeType: current_API.overrideMimeType
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

	const response = await Request(importStreams_RequestOptions).get();

	let data = response.json;

	consoleDir(data, `${website} - ${id} (${response.url})`);

	streamListFromSetting.refresh();

	let importStreamList_Data;
	if(typeof pageNumber === "number"){
		importStreamList_Data = websites.get(website).importStreamWebsites(id, data, streamListFromSetting, pageNumber);
	} else {
		importStreamList_Data = websites.get(website).importStreamWebsites(id, data, streamListFromSetting);
	}

	if(importStreamList_Data.list !== null){
		for(let id of importStreamList_Data.list){
			streamListFromSetting.addStream(website, id, "");
		}
		streamListFromSetting.update();

		if(importStreamList_Data.hasOwnProperty("next") === true && importStreamList_Data.next !== null){
			if(importStreamList_Data.next.hasOwnProperty("pageNumber") === true){
				let recursive_result;
				try{
					recursive_result = await importStreams(website, id, importStreamList_Data.next.url, importStreamList_Data.next.pageNumber);
				} catch(err){
					recursive_result = err;
				}

				return recursive_result;
			} else {
				let recursive_result;
				try{
					recursive_result = await importStreams(website, id, importStreamList_Data.next.url);
				} catch(err){
					recursive_result = err;
				}

				return recursive_result;
			}
		} else {
			importStreamsEnd(website, id);
			return "ImportEnd";
		}
	} else {
		importStreamsEnd(website, id);
		return "ImportEnd_DataNull";
	}
}
function importStreamsEnd(website, id){
	setIcon();
	timingEnd(`import_${website}`);
}

//				------ Load / Unload Event(s) ------				//

async function getRedirectedURL(URL, maxRedirect){
	const data = await Request({
		url: URL,
		contentType: "document"
	}).get();

	if(data.response === null){
		return URL;
	} else {
		let redirectMetaNode = data.response.querySelector("meta[http-equiv=refresh]");
		let getURL = /0;URL=(.*)/i;

		if(typeof maxRedirect === "number" && redirectMetaNode !== null && getURL.test(redirectMetaNode.content)){
			let newURL = getURL.exec(redirectMetaNode.content)[1];
			return await getRedirectedURL(newURL, maxRedirect - 1);
		} else if(typeof data.url === "string" && data.url !== ""){
			return data.url;
		} else {
			return URL;
		}
	}
}

// Begin to check lives
/**
 * @type ZTimer
 */
let interval = null;
function initAddon(){
	if (typeof browser.contextMenus !== "undefined" && typeof browser.contextMenus.create === "function") {
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
	}

	let localToRemove = [];
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

	if(localToRemove.length > 0){
		browser.storage.local.remove(localToRemove)
			.catch(err=>{
				if(err) consoleMsg("warn", `Error removing preference(s) from Web Extension local storage: ${err}`);
			})
		;
	}

	let toRemove = ["livenotifier_version"];
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





	const
		/**
		 *
		 * @param {ZTimer} zTimer
		 * @return {Promise<void>}
		 */
		syncTrigger = async function(zTimer){
			await updateSyncData(zTimer)
				.catch(err=>{
					consoleMsg('error', err);
				})
			;
		},
		syncInterval = ZTimer.setInterval('syncInterval', 10, 'm', function (){
			const zTimer = this;

			syncTrigger(zTimer)
				.catch(err=>{
					consoleMsg('error', err);
				})
			;
		})
	;



	let dropboxClientId = getPreference('dropboxClientId'),
		dropboxAuthToken = getPreference('dropboxClientAuthToken'),

		dropboxController = null
	;

	/**
	 *
	 * @param {String} dropboxClientId
	 * @param {String} dropboxAuthToken
	 * @return {DropboxController | null}
	 */
	const updateDropboxController = function(dropboxClientId, dropboxAuthToken){
		if(dropboxController!==null){
			dropboxController.dropboxClientId = dropboxClientId;
			dropboxController.dropboxAuthToken = dropboxAuthToken;
		} else if(dropboxAuthToken!=='' || dropboxClientId!==''){
			dropboxController = new DropboxController('livenotifier.json', dropboxClientId, dropboxAuthToken);
		} else {
			dropboxController = null;
		}

		return dropboxController;
	};

	/**
	 *
	 * @param {ZTimer=null} zTimer
	 * @return {Promise<void>}
	 */
	const updateSyncData = async function (zTimer=null) {
		if(dropboxController===null){
			return;
		}

		let needUpload = updatedPreferences.size > 0,
			currentSyncData = null,
			currentSyncMetaData = null
		;


		try {
			let {data, metadata} = await dropboxController.get();
			currentSyncData = data;
			currentSyncMetaData = metadata;
		} catch (e) {
			const msg = e.toString();
			if (msg === 'InvalidJson' || msg === 'NoFile') {
				consoleMsg('warn', `Dropbox error "${msg}" (ignoring eventual existing file)`);
				needUpload = true;
			} else {
				consoleMsg('error', e);
			}
		}

		const date = (getPreference(CHROME_PREFERENCES_SYNC_ID)!=='')? ZDK.validDateOrNull(new Date(getPreference(CHROME_PREFERENCES_SYNC_ID))) : null,
			currentSyncDate = (currentSyncMetaData !== null && currentSyncMetaData.hasOwnProperty('server_modified'))? ZDK.validDateOrNull(new Date(currentSyncMetaData.server_modified)) : null
		;


		if (currentSyncData!==null && currentSyncData.hasOwnProperty('preferences') && currentSyncData.hasOwnProperty('live_notifier_version')) {
			const data = new Map(Object.entries(currentSyncData.preferences));

			if (currentSyncDate !== date) {
				let isNewer = false;

				if (date === null) {
					isNewer = null;
				} else if (currentSyncDate > date) {
					isNewer = true;

					data.forEach((value, prefId) => {
						if (prefId !== 'stream_keys_list' && updatedPreferences.has(prefId) === false) {
							savePreference(prefId, value);
						}
					});
				}

				const oldStreamList = getPreference('stream_keys_list');

				streamListFromSetting.mergeData(data.get('stream_keys_list'), isNewer);
				streamListFromSetting.update();

				if (needUpload === false && getPreference('stream_keys_list') !== oldStreamList) {
					needUpload = true;
				}
			}
		}



		updatedPreferences.clear();

		if (needUpload === true) {
			let uploadDate = new Date(),
				newMetaData = null
			;

			savePreference(CHROME_PREFERENCES_SYNC_ID, uploadDate.toISOString());

			try {
				newMetaData = await dropboxController.set(chromeSettings.getSyncPreferences());
			} catch (e) {
				consoleMsg('error', e);
			}

			if (newMetaData !== null && newMetaData.hasOwnProperty('server_modified')) {
				uploadDate = new Date(newMetaData.server_modified);
				savePreference(CHROME_PREFERENCES_SYNC_ID, uploadDate.toISOString());
			}
		} else {
			savePreference(CHROME_PREFERENCES_SYNC_ID, currentSyncDate.toISOString());
		}



		if(zTimer!==null){
			await zTimer.init()
				.catch(err=>{
					consoleMsg('error', err);
				})
			;
		}
	};



	const updatedPreferences = new Map(),
		uploadSyncData = _.debounce(function () {
			updateSyncData(syncInterval)
				.catch(err=>{
					consoleMsg('error', err);
				})
			;
		}, 1000, {
			maxWait: 10000
		})
	;

	dropboxController = updateDropboxController(dropboxClientId, dropboxAuthToken);
	if (dropboxController !== null) {
		uploadSyncData();
	}

	browser.storage.onChanged.addListener((changes, area) => {
		if(area === "local"){
			for(let prefId in changes){
				if(changes.hasOwnProperty(prefId)){
					switch(prefId){
						case "dropboxClientId":
							dropboxClientId = changes[prefId].newValue;
							break;
						case "dropboxClientAuthToken":
							dropboxClientAuthToken = changes[prefId].newValue;
							break;
					}

					if (prefId!==CHROME_PREFERENCES_SYNC_ID && chromeSettings.defaultSettingsSync.has(prefId) && updatedPreferences.has(prefId) === false) {
						updatedPreferences.set(prefId, '');
					}
				}
			}

			if (updatedPreferences.size > 0) {
				if (updatedPreferences.has('dropboxClientId') || dropboxClientId.has('dropboxClientAuthToken')) {
					dropboxController = updateDropboxController(dropboxClientId, dropboxAuthToken);
				}

				uploadSyncData();
			}
		}
	});





	streamListFromSetting.refresh(true);

	checkLives()
		.catch(err=>{
			consoleMsg("warn", err);
		})
	;
}

// Checking if updated
let previousVersion = "",
	current_versionStr = appGlobal["versionStr"] = browser.runtime.getManifest().version,
	current_version = appGlobal["version"] = browser.runtime.getManifest().version
;

function checkIfUpdated(details){
	let installReason = details.reason;
	consoleMsg("info", `Runtime onInstalled reason: ${installReason}`);


	// Checking if updated
	if(installReason === "update" || installReason === "unknown"){
		previousVersion = details.previousVersion;
		const current_version_numbers = appGlobal["version"] = new Version(current_versionStr);



		if (previousVersion !== current_versionStr) {
			const previousVersion_numbers = new Version(previousVersion);

			if (current_version_numbers.compareTo(previousVersion_numbers) === 1) {
				doNotif({
					"message": i18ex._("Addon_have_been_updated", {"version": current_versionStr})
				})
					.catch(err=>{
						consoleMsg("warn", err);
					})
				;

				if(installReason==="install" || (previousVersion_numbers[0] <= 11 && previousVersion_numbers[1]<=16)){
					ZDK.openTabIfNotExist(chrome.extension.getURL("/data/options.html#news"))
						.catch(console.error)
					;
				}
			}
		}
	}

	/*if(typeof chrome.runtime.onInstalled !== "undefined" && typeof chrome.runtime.onInstalled.addListener === "function" && typeof chrome.runtime.onInstalled.removeListener === "function"){
		chrome.runtime.onInstalled.removeListener(checkIfUpdated);
	}*/

	savePreference("livenotifier_version", current_versionStr);
}



function refreshEnabledWebsites() {
	websites.clear();

	websitesLoaded.forEach((websiteObj, website)=>{
		let state = true;

		if(websiteObj.hasOwnProperty("enabled")){
			switch(typeof websiteObj.enabled){
				case "boolean":
					if(websiteObj.enabled===false){
						state = false;
					}
					break;
				case "function":
					const fnResult = websiteObj.enabled();
					if(fnResult===false){
						state = false;
						return;
					}
					break;
			}
		}

		if(state===true){
			websites.set(website, websiteObj);
		}
	});
}
appGlobal["refreshEnabledWebsites"] = refreshEnabledWebsites;



(async ()=>{
	appGlobal.chromeSettings = chromeSettings;
	consoleDir(chromeSettings,"Current preferences in the local storage:");

	/*if(typeof chrome.runtime.onInstalled !== "undefined" && typeof chrome.runtime.onInstalled.addListener === "function" && typeof chrome.runtime.onInstalled.removeListener === "function"){
		chrome.runtime.onInstalled.addListener(checkIfUpdated);
	} else {*/
		consoleMsg("warn", "browser.runtime.onInstalled is not available");
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
	// }

	let platformsLoad_result;
	try{
		platformsLoad_result = await zDK.loadJS(document, ["dailymotion.js", "mixer.js", "openrec_tv.js", "picarto_tv.js", "smashcast.js", "twitch.js", "youtube.js"], "/data/js/platforms/");
	} catch(err){
		platformsLoad_result = err;
	}

	websites.forEach((websiteObj, website)=>{
		Object.freeze(websiteObj);
		websitesLoaded.set(website, websiteObj);
	});

	initAddon(platformsLoad_result);
})();
