'use strict';

// Avoid keeping init node in memory
let panelinitjs_node = document.querySelector("#panelInit");
panelinitjs_node.parentNode.removeChild(panelinitjs_node);

/*function sendDataToMain(id, data){
	chrome.runtime.sendMessage({"sender": "Live_Notifier_Panel","receiver": "Live_Notifier_Main", "id": id, "data": data});
}*/

var backgroundPage = browser.extension.getBackgroundPage();

var theme_cache_update = backgroundPage.backgroundTheme.theme_cache_update;

let {options, appGlobal} = backgroundPage;

let sendDataToMain = function (id, data) {
	appGlobal.sendDataToMain("Live_Notifier_Panel", id, data);
};

function copyToClipboard(string){
	let copy = function(string){
		if(document.querySelector("#copy_form") !== null){
			let node = document.querySelector("#copy_form");
			node.parentNode.removeChild(node);
		}
		let copy_form = document.createElement("textarea");
		copy_form.id = "copy_form";
		copy_form.textContent = string;
		copy_form.class = "hide";
		document.querySelector("body").appendChild(copy_form);
		
		copy_form.focus();
		copy_form.select();
		let clipboard_success = document.execCommand('Copy');
		if(clipboard_success){
			appGlobal.doNotif({
				"message": i18ex._("clipboard_success")
			})
				.catch(err=>{
					console.warn(err);
				});
			console.info(`Copied: ${string}`);
		} else {
			appGlobal.doNotif({
				"message": i18ex._("clipboard_failed")
			})
				.catch(err=>{
					console.warn(err);
				})
			;
		}
		
		copy_form.parentNode.removeChild(copy_form);
	};
	
	if(typeof chrome.permissions !== "undefined"){
		chrome.permissions.contains({
			permissions: ['clipboardWrite'],
		}, function(result) {
			if(result){
				copy(string);
			} else {
				console.log("Clipboard writing permission not granted");
				chrome.permissions.request({
					permissions: ['clipboardWrite'],
				}, function(result) {
					if(result){
						copy(string);
					} else {
						console.error("The extension doesn't have the permissions.");
					}
				});
			}
		});
	} else {
		copy(string);
	}
}

const Mustache = backgroundPage.Mustache;

let { streamListFromSetting,
	websites,
	liveStatus,
	channelInfos,
	getCleanedStreamStatus,
	getStreamURL,
	getOfflineCount,
	doStreamNotif,
	setIcon,
	checkMissing } = appGlobal;


$(document).on("click", "#refreshStreams", ()=>{
	sendDataToMain("refreshStreams","");
});

$(document).on("click", "#addStream", ()=>{
	sendDataToMain("addStream","");
});

$(document).on("click", "#disableNotifications", ()=>{
	let disableNotificationsButton = document.querySelector("#disableNotifications");
	appGlobal["notificationGlobalyDisabled"] = !appGlobal["notificationGlobalyDisabled"];
	disableNotificationsButton.classList.toggle("off", backgroundPage.appGlobal["notificationGlobalyDisabled"]);

	$(disableNotificationsButton).tooltip("hide");
	disableNotificationsButton.dataset.originalTitle = disableNotificationsButton.title = i18ex._((backgroundPage.appGlobal["notificationGlobalyDisabled"])? "GloballyDisabledNotifications" : "GloballyDisableNotifications");
	$(disableNotificationsButton).tooltip("show");

});

function allowDrop(event){
	event.preventDefault();
}
function drag(event) {
	let node = event.target;
	if(node.draggable === true && node.dataset.streamId !== null){
		let id = node.dataset.streamId;
		let website = node.dataset.streamWebsite;
		
		let data = {id: id, website: website};
		
		event.dataTransfer.setData("text", JSON.stringify(data));
	}
}
function drop(event) {
	event.preventDefault();
	
	let dropDiv = document.querySelector("#deleteStream");
	dropDiv.classList.remove("active");
	
	let data = JSON.parse(event.dataTransfer.getData("text"));
	
	sendDataToMain("deleteStream", {id: data.id, website: data.website});
}
function dragenter(event){
	if(event.target.classList.contains('dragover') === true){
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.classList.add("active");
	}
}
function dragleave(event){
	if(event.target.classList.contains('dragover') === false){//Chrome only: FALSE
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.classList.remove("active");
	}
}
let dropDiv = document.querySelector("#deleteStream");
dropDiv.addEventListener("drop", drop);
dropDiv.addEventListener("dragover", allowDrop);
document.addEventListener("dragenter", dragenter); // Event dragging something and entering a valid node
document.addEventListener("dragleave", dragleave); // Event dragging something and leaving a valid node
document.addEventListener("dragstart", drag); // Get dragged element data

let deleteStreamButton = document.querySelector("#deleteStream");
let streamChangeMode = false;
let deleteStreams = backgroundPage.deleteStreams;

function deleteStreamButtonClick(){
	if(streamChangeMode){
		let toDelete = document.querySelectorAll(".item-stream .deleteStreamButton.active");
		for(let node of toDelete){
			if(typeof node.tagName === "string"){
				node.classList.remove("active");
			}
		}
	}
	
	let ignoreStreamButtons = document.querySelectorAll(".item-stream .ignoreStreamButton");
	let streamListSettings = new streamListFromSetting();
	for(let node of ignoreStreamButtons){
		let website = node.dataset.website;
		let id = node.dataset.id;
		if(streamListSettings.mapDataAll.has(website) && streamListSettings.mapDataAll.get(website) && streamListSettings.mapDataAll.get(website).has(id)){
			node.classList.toggle("active", streamListSettings.mapDataAll.get(website).get(id).ignore);
		}
	}
	
	streamChangeMode = !streamChangeMode;
	document.querySelector("#deleteModeControles").classList.toggle("hide",!streamChangeMode);
	document.querySelector("#streamList").classList.toggle("deleteButtonMode");
}
deleteStreamButton.addEventListener("click", deleteStreamButtonClick, false);

let confirmChanges_Node = document.querySelector("#confirmChanges"),
	cancelChanges_Node = document.querySelector("#cancelChanges");
function cancelChanges(){
	let toDelete = document.querySelectorAll(".item-stream .deleteStreamButton.active");
	for(let node of toDelete){
		if(typeof node.tagName === "string"){
			node.classList.remove("active");
		}
	}
	deleteStreamButtonClick();
}
cancelChanges_Node.addEventListener("click", cancelChanges, false);
function confirmChanges(){
	if(streamChangeMode){
		let toDeleteMap = new Map();
		let toDelete = document.querySelectorAll(".item-stream .deleteStreamButton.active");
		if(toDelete !== null){
			for(let node of toDelete){
				if(typeof node.tagName === "string"){
					node.classList.remove("active");
					let id = node.dataset.id,
						website = node.dataset.website;
					if(!toDeleteMap.has(website)){
						toDeleteMap.set(website, []);
					}
					if(toDeleteMap.get(website).indexOf(id) === -1){
						toDeleteMap.get(website).push(id);
					}
				}
			}
			deleteStreams(toDeleteMap);
		}
		let ignoreStreamButtons = document.querySelectorAll(".item-stream .ignoreStreamButton");
		let streamListSettings = new streamListFromSetting();
		for(let node of ignoreStreamButtons){
			let website = node.dataset.website;
			let id = node.dataset.id;
			if(streamListSettings.mapDataAll.has(website) && streamListSettings.mapDataAll.get(website) && streamListSettings.mapDataAll.get(website).has(id)){
				streamListSettings.mapDataAll.get(website).get(id).ignore = node.classList.contains("active");
			}
		}
		streamListSettings.update();
	}
	updatePanelData({"doUpdateTheme": false});
	deleteStreamButtonClick();
}
confirmChanges_Node.addEventListener("click", confirmChanges, false);

/*				---- Search Button ----				*/
let toggle_search_button = document.querySelector("button#searchStream");
let searchInput_onInput_Loaded = false;
function searchContainer_Toggle(){
	let searchInputContainer = document.querySelector("#searchInputContainer");
	
	let searchInput = document.querySelector("input#searchInput");
	if(!searchInput_onInput_Loaded){
		searchInput.addEventListener("input", searchInput_onInput);
		
		let searchLabel = document.querySelector("#searchInputContainer label");
		searchLabel.addEventListener("click", searchInput_onInput);
	}
	
	searchInputContainer.classList.toggle("hide");
	searchInput.value = "";
	searchInput_onInput();
	if(!searchInput.classList.contains("hide")){
		searchInput.focus();
	}
	
	scrollbar_update("streamList");
}
toggle_search_button.addEventListener("click", searchContainer_Toggle);


function searchInput_onInput(){
	let searchInput = document.querySelector("input#searchInput");
	
	let somethingElseThanSpaces = /[^\s]+/;
	let search = searchInput.value.toLowerCase();
	let searchCSS_Node = document.querySelector("#search-cssSelector");
	let cssSelector = "";
	if(search.length > 0 && somethingElseThanSpaces.test(search)){
		searchCSS_Node.textContent = `
.item-stream:not([data-stream-name-lowercase*="${search}"]):not([data-stream-status-lowercase*="${search}"]):not([data-stream-game-lowercase*="${search}"]):not([data-stream-website-lowercase*="${search}"]){
	display: none;
	visibility: hidden;
}
`;
	} else {
		searchCSS_Node.textContent = "";
	}
	scrollbar_update("streamList");
}

/*				---- Settings ----				*/
let settings_button = document.querySelector("#settings");
let setting_Enabled = false;
function unhideClassNode(node){
	node.classList.remove("hide");
}
function hideClassNode(node){
	node.classList.add("hide");
}
let optionsLoaded = false;
function selectSection(sectionNodeId){
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	let debugSection = document.querySelector("section#debugSection");
	
	if(typeof sectionNodeId === "string" && sectionNodeId !== ""){
		let sectionList = [streamList, streamEditor, settings_node, debugSection];
		
		let sectionEnabled = false;
		for(let i in sectionList){
			if(sectionList.hasOwnProperty(i)){
				if(sectionList[i].id === sectionNodeId){
					sectionEnabled = true;
					unhideClassNode(sectionList[i]);
					scrollbar_update(sectionNodeId);

					switch(sectionNodeId){
						case "streamList":
							setting_Enabled = false;
							sendDataToMain("refreshPanel", "");
							break;
						case "settings_container":
							if(!optionsLoaded){
								optionsLoaded = true;
								loadPreferences("section#settings_container #preferences");
							}
							setting_Enabled = true;
							break;
					}
				} else {
					hideClassNode(sectionList[i]);
				}
			}
		}
		if(sectionEnabled === false){
			unhideClassNode(streamList);
		}
	}
}
function setting_Toggle(sectionNodeId){
	if(setting_Enabled){
		selectSection("streamList");
	} else {
		selectSection("settings_container");
	}
}
settings_button.addEventListener("click", setting_Toggle, false);

$(document).on("click", "#open_optionpage", ()=>{browser.runtime.openOptionsPage()});

$(document).on("click", "#ignoreHideIgnore", ()=>{ignoreHideIgnore = true;});

if(typeof browser.storage.sync === "object"){
	document.querySelector("#syncContainer").classList.remove("hide");
	
	let restaure_sync_button = document.querySelector("#restaure_sync");
	restaure_sync_button.addEventListener("click", function(event){restaureOptionsFromSync(event);});
	
	let save_sync_button = document.querySelector("#save_sync");
	save_sync_button.addEventListener("click", function(event){saveOptionsInSync(event);});
}

/*				---- Debug section ----				*/

$(document).on("click", "#close_debugSection", ()=>{
	selectSection("streamList");
});

$(document).on("dblclick", "#current_version", enableDebugSection);

function enableDebugSection(){
	if(getPreference("showAdvanced") && getPreference("showExperimented")){
		selectSection("debugSection");
	}
}

/*				---- End Debug section ----				*/

/*				---- Setting nodes generator ----				*/

//loadPreferences("section#settings_container #preferences");

/*			---- Settings end ----			*/

/*			---- Stream Editor----			*/

$(document).on("click", "#closeEditor", ()=>{
	selectSection("streamList");
});

$(document).on("click", "#saveEditedStream", function(){
	const node = this;

	let website = node.dataset.website,
		id = node.dataset.id,
		contentId = node.dataset.contentId,
		customURL_node = document.querySelector("#customURL");

	function removeEmplyItems(obj){
		for(let i in obj){
			if(obj.hasOwnProperty(i) && obj[i] === "" /* || /^\s+$/ */){
				delete obj[i];
			}
		}
		return obj;
	}

	let streamSettingsData = {
		streamURL: (customURL_node.validity.valid === true)? customURL_node.value : "",
		statusBlacklist: removeEmplyItems(document.querySelector("#streamEditor #status_blacklist").value.split('\n')),
		statusWhitelist: removeEmplyItems(document.querySelector("#streamEditor #status_whitelist").value.split('\n')),
		gameBlacklist: removeEmplyItems(document.querySelector("#streamEditor #game_blacklist").value.split('\n')),
		gameWhitelist: removeEmplyItems(document.querySelector("#streamEditor #game_whitelist").value.split('\n')),
		twitter: document.querySelector("#streamEditor #twitter").value,
		hide: document.querySelector("#streamEditor #hideStream").checked,
		ignore: document.querySelector("#streamEditor #ignoreStream").checked,
		iconIgnore: document.querySelector("#streamEditor #iconIgnore").checked,
		vocalStreamName: document.querySelector("#streamEditor #vocalStreamName").value,
		notifyOnline: document.querySelector("#streamEditor #notifyOnline").checked,
		notifyVocalOnline: document.querySelector("#streamEditor #notifyVocalOnline").checked,
		notifyOffline: document.querySelector("#streamEditor #notifyOffline").checked,
		notifyVocalOffline: document.querySelector("#streamEditor #notifyVocalOffline").checked
	};

	sendDataToMain("streamSetting_Update", {
		website: website,
		id: id,
		contentId: contentId,
		streamSettingsData: streamSettingsData
	});

	selectSection("streamList");
});

/*			---- Stream Editor end----			*/
let ignoreHideIgnore = false;
function updatePanelData(doUpdateTheme=true){
	console.log("Updating panel data");
	
	if(doUpdateTheme === true){
		theme_update();
	}
	
	//Clear stream list in the panel
	initList({"group_streams_by_websites": getPreference("group_streams_by_websites"), "show_offline_in_panel": getPreference("show_offline_in_panel")});
	
	let show_offline_in_panel = getPreference("show_offline_in_panel");
	
	let streamListSettings = new streamListFromSetting().mapDataAll;
	streamListSettings.forEach((streamList, website) => {
		streamList.forEach((value, id) => {
			if(!ignoreHideIgnore){
				if(typeof streamList.get(id).ignore === "boolean" && streamList.get(id).ignore === true){
					//console.info(`[Live notifier - Panel] Ignoring ${id}`);
					return;
				}
				if(typeof streamList.get(id).hide === "boolean" && streamList.get(id).hide === true){
					//console.info(`[Live notifier - Panel] Hiding ${id}`);
					return;
				}
			}
			
			if(liveStatus.has(website) && liveStatus.get(website).has(id) && liveStatus.get(website).get(id).size > 0){
				liveStatus.get(website).get(id).forEach((streamData, contentId) => {
					getCleanedStreamStatus(website, id, contentId, streamList.get(id), streamData.liveStatus.API_Status);
					
					if(streamData.liveStatus.filteredStatus || (show_offline_in_panel && !streamData.liveStatus.filteredStatus)){
						doStreamNotif(website, id, contentId, streamList.get(id), streamData.liveStatus.API_Status);
						
						listener(website, id, contentId, "live", streamList.get(id), streamData);
					}
				})
			} else {
				if(channelInfos.has(website) && channelInfos.get(website).has(id)){
					//let streamData = channelInfos.get(website).get(id);
					//let contentId = id;
					
					//console.info(`Using channel infos for ${id} (${website})`);
					
					listener(website, id, /* contentId */ id, "channel", streamList.get(id), channelInfos.get(website).get(id));
				} else if(websites.has(website)){
					console.info(`Currrently no data for ${id} (${website})`);
					if((typeof streamList.get(id).ignore === "boolean" && streamList.get(id).ignore === true) || (typeof streamList.get(id).hide === "boolean" && streamList.get(id).hide === true)){
						let contentId = id;
						let streamData = {"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
						let website_channel_id = appGlobal["website_channel_id"];
						if(website_channel_id.test(streamData.streamName)){
							streamData.streamName = website_channel_id.exec(streamData.streamName)[1];
						}
						listener(website, id, contentId, website, streamList.get(id), streamData);
					}
				} else {
					let contentId = id;
					let streamData = {"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
					console.warn(`The website of ${id} ("${website}") is not supported or not loaded`);
					listener(website, id, contentId, "unsupported", streamList.get(id), streamData);
				}
			}
		});
	});
	scrollbar_update("streamList");
	
	liveStatus.forEach((website_liveStatus, website) => {
		website_liveStatus.forEach((id_liveStatus, id) => {
			// Clean the streams already deleted but status still exist
			if(!streamListSettings.get(website).has(id)){
				console.info(`${id} from ${website} was already deleted but not from liveStatus ${(channelInfos.get(website).has(id))? "and channelInfos" : ""}`);
				liveStatus.get(website).delete(id);
				if(channelInfos.get(website).has(id)){
					channelInfos.get(website).delete(id);
				}
			}
		})
	});
	
	checkMissing();
	
	//Update online steam count in the panel
	let onlineCount = appGlobal["onlineCount"];
	listenerOnlineCount((onlineCount === 0)? i18ex._("No_stream_online") :  i18ex._("count_stream_online", {count: onlineCount}));
	
	if(show_offline_in_panel){
		let offlineCount = getOfflineCount();
		listenerOfflineCount((offlineCount === 0)? i18ex._("No_stream_offline") :  i18ex._("count_stream_offline", {count: offlineCount}));
	} else {
		listenerOfflineCount("");
	}
	
	let debug_checkingLivesState_node = document.querySelector("#debug_checkingLivesState");
	debug_checkingLivesState_node.className = appGlobal["checkingLivesFinished"];
	
	//Update Live notifier version displayed in the panel preferences
	if(typeof appGlobal["version"] === "string"){
		current_version(appGlobal["version"]);
	}
}

function removeAllChildren(node){
	// Taken from https://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
	while (node.hasChildNodes()) {
		node.lastChild.removeEventListener("click", streamItemClick);
		node.removeChild(node.lastChild);
	}
}

let group_streams_by_websites = true;
function initList(data){
	let showOffline = data.show_offline_in_panel;
	group_streams_by_websites = data.group_streams_by_websites;
	
	let streamItems = document.querySelectorAll(".item-stream");
	if(streamItems.length > 0){
		for(let i in streamItems){
			if(streamItems.hasOwnProperty(i)){
				let node = streamItems[i];
				if(typeof node.removeChild !== "undefined"){
					node.removeEventListener("click", streamItemClick);
					node.parentNode.removeChild(node);
				}
			}
		}
	}
	
	unhideClassNode(document.querySelector("#noErrorToShow"));
	removeAllChildren(document.querySelector("#debugData"));
	
	document.querySelector("#streamListOffline").classList.toggle("hide", !showOffline)
}

function listenerOnlineCount(data){
	let streamOnlineCountNode = document.querySelector("#streamOnlineCountLabel");
	removeAllChildren(streamOnlineCountNode);
	streamOnlineCountNode.textContent = data;
}

function listenerOfflineCount(data){
	let streamOfflineCountNode = document.querySelector("#streamOfflineCountLabel");
	removeAllChildren(streamOfflineCountNode);
	streamOfflineCountNode.textContent = data;
}

function newDeleteStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	// let id = node.dataset.id;
	// let website = node.dataset.website;
	
	node.classList.toggle("active");
	//sendDataToMain("deleteStream", {id: id, website: website});
}
function newIgnoreStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	// let id = node.dataset.id;
	// let website = node.dataset.website;
	
	node.classList.toggle("active");
}
function newShareStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	sendDataToMain("shareStream", {
		website: node.dataset.website,
		id: node.dataset.id,
		contentId: node.dataset.contentId,
	});
}
function newEditStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.dataset.id;
	let contentId = node.dataset.contentId;
	let website = node.dataset.website;
	let title = node.dataset.title;
	
	let streamSettings = JSON.parse(node.dataset.streamSettings);
	
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	
	hideClassNode(streamList);
	hideClassNode(settings_node);
	
	let titleNode = document.querySelector("#editedStreamTitle");
	titleNode.textContent = title;
	
	let saveEditedStream = document.querySelector("#saveEditedStream");
	saveEditedStream.dataset.id = id;
	saveEditedStream.dataset.contentId = contentId;
	saveEditedStream.dataset.website = website;
	
	document.querySelector("#streamEditor #customURL").value = streamSettings.streamURL;
	document.querySelector("#streamEditor #status_blacklist").value = (streamSettings.statusBlacklist)? streamSettings.statusBlacklist.join("\n") : "";
	document.querySelector("#streamEditor #status_whitelist").value = (streamSettings.statusWhitelist)? streamSettings.statusWhitelist.join("\n") : "";
	document.querySelector("#streamEditor #game_blacklist").value = (streamSettings.gameBlacklist)? streamSettings.gameBlacklist.join("\n") : "";
	document.querySelector("#streamEditor #game_whitelist").value = (streamSettings.gameWhitelist)? streamSettings.gameWhitelist.join("\n") : "";
	document.querySelector("#streamEditor #twitter").value = (streamSettings.twitter)? streamSettings.twitter : "";
	document.querySelector("#streamEditor #hideStream").checked = (typeof streamSettings.hide === "boolean")? streamSettings.hide : false;
	document.querySelector("#streamEditor #ignoreStream").checked = (typeof streamSettings.ignore === "boolean")? streamSettings.ignore : false;
	document.querySelector("#streamEditor #iconIgnore").checked = (typeof streamSettings.iconIgnore === "boolean")? streamSettings.iconIgnore : false;
	document.querySelector("#streamEditor #vocalStreamName").value = (typeof streamSettings.vocalStreamName === "string")? streamSettings.vocalStreamName : "";
	document.querySelector("#streamEditor #notifyOnline").checked = (typeof streamSettings.notifyOnline === "boolean")? streamSettings.notifyOnline : true;
	document.querySelector("#streamEditor #notifyVocalOnline").checked = (typeof streamSettings.notifyVocalOnline === "boolean")? streamSettings.notifyVocalOnline : true;
	document.querySelector("#streamEditor #notifyOffline").checked = (typeof streamSettings.notifyOffline === "boolean")? streamSettings.notifyOffline : false;
	document.querySelector("#streamEditor #notifyVocalOffline").checked = (typeof streamSettings.notifyVocalOffline === "boolean")? streamSettings.notifyVocalOffline : false;
	
	unhideClassNode(streamEditor);
	scrollbar_update("streamEditor");
}
function newCopyStreamURLButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.dataset.id;
	let contentId = node.dataset.contentId;
	let website = node.dataset.website;
	
	copyToClipboard(getStreamURL(website, id, contentId, false));
}

const streamTemplate = appGlobal.mustacheTemplates.get("streamTemplate"),
	streamListTemplate = appGlobal.mustacheTemplates.get("streamListTemplate");

const websitesList = [];
websites.forEach((value, id)=>{
	websitesList.push(id);
});
$(Mustache.render(streamListTemplate, {
	"websites": websitesList
})).appendTo("#streamList");

function insertStreamNode(newLine, website, id, contentId, type, streamData, online){
	let statusNode = document.querySelector(`#streamList${(online)? "Online" : "Offline"}`),
		statusStreamList = statusNode.querySelectorAll(".item-stream");

	document.querySelector("body").classList.toggle("groupedStreams", group_streams_by_websites);

	if(group_streams_by_websites){
		const selector = `#streamList${((online)? "Online" : "Offline")} .${(websites.has(website))? website : "unsupported"}`;
		return $(selector).append(newLine);
	} else {
		if(statusStreamList.length > 0){
			for(let streamNode of statusStreamList){
				if(typeof streamNode.tagName === "string"){
					let streamNode_title = streamNode.dataset.streamName;
					if(streamData.streamName.toLowerCase() < streamNode_title.toLowerCase()){
						return $(newLine).insertBefore(streamNode);
					}
				}
			}
		}
		return $(newLine).appendTo(statusNode);
	}
}

$(document).on("click", ".item-stream", streamItemClick);
$(document).on("click", ".item-stream .deleteStreamButton",	newDeleteStreamButton_onClick);
$(document).on("click", ".item-stream .ignoreStreamButton",	newIgnoreStreamButton_onClick);
$(document).on("click", ".item-stream .copyStreamURL",		newCopyStreamURLButton_onClick);
$(document).on("click", ".item-stream .editStreamButton",	newEditStreamButton_onClick);
$(document).on("click", ".item-stream .shareStreamButton",	newShareStreamButton_onClick);

function listener(website, id, contentId, type, streamSettings, streamData){
	let online = false;
	switch(type){
		case "live":
			online = streamData.liveStatus.filteredStatus;
			break;
		case "channel":
			online = streamData.liveStatus.API_Status;
			break;
	}
	let liveStatus = streamData.liveStatus;

	let streamRenderData = {
		"streamId": id,
		"contentId": contentId,
		"online": online,
		"streamName": streamData.streamName,
		"streamNameLowercase": streamData.streamName.toLowerCase(),
		"streamWebsite": website,
		"streamWebsiteLowercase": website.toLowerCase(),
		//"streamUrl": streamUrl,
		"streamType": type,
		"unsupportedType": (type === "unsupported"),
		"streamSettings": JSON.stringify(streamSettings)
	};
	
	if(online){
		streamRenderData.streamStatus = streamData.streamStatus;
		streamRenderData.streamStatusLowercase = streamData.streamStatus.toLowerCase();
		if(streamData.streamGame.length > 0){
			streamRenderData.streamGame = streamData.streamGame;
			streamRenderData.streamGameLowercase = streamData.streamGame.toLowerCase();
		}
		if(typeof streamData.streamCurrentViewers === "number"){
			let viewer_number = (typeof streamData.streamCurrentViewers === "number")? streamData.streamCurrentViewers : parseInt(streamData.streamCurrentViewers);
			streamRenderData.streamCurrentViewers = (viewer_number < 1000)? viewer_number : ((Math.round(viewer_number / 100)/10) + "k");
		}
	}

	//let streamUrl = (type == "live" || type == "channel")? getStreamURL(website, id, contentId, true) : "";
	const websiteStreamURL = getStreamURL(website, id, contentId, false);
	if(websiteStreamURL !== "" && websiteStreamURL !== null){
		streamRenderData.streamURL = websiteStreamURL;
	}

	if(typeof streamData.facebookID === "string" && streamData.facebookID !== ""){
		streamRenderData.facebookId = streamData.facebookID;
	}
	if(typeof streamData.twitterID === "string" && streamData.twitterID !== ""){
		streamRenderData.twitterId = streamData.twitterID;
	}

	let streamLogo = "";
	if(online && typeof streamData.streamCategoryLogo === "string" && streamData.streamCategoryLogo !== ""){
		streamLogo  = streamData.streamCategoryLogo;
	} else if(typeof streamData.streamOwnerLogo === "string" && streamData.streamOwnerLogo !== ""){
		streamLogo  = streamData.streamOwnerLogo;
	}
	
	if(typeof streamLogo === "string" && streamLogo !== ""){
		streamRenderData.streamLogo = streamLogo;
	}
	/*const newNode =*/ insertStreamNode(Mustache.render(streamTemplate, streamRenderData), website, id, contentId, type, streamData, online);

	if(typeof liveStatus.lastCheckStatus === "string" && liveStatus.lastCheckStatus !== "" && liveStatus.lastCheckStatus !== "success"){
		let debugDataNode = document.querySelector("#debugData");
		let newDebugItem = document.createElement('div');
		newDebugItem.classList.add("debugItem");
		newDebugItem.dataset.streamWebsite = website;
		
		let newDebugItem_title = document.createElement('span');
		newDebugItem_title.classList.add("debugTitle");
		newDebugItem_title.textContent = streamData.streamName;
		newDebugItem.appendChild(newDebugItem_title);
		
		let newDebugItem_status = document.createElement('span');
		newDebugItem_status.textContent = `${liveStatus.lastCheckStatus}`;
		newDebugItem.appendChild(newDebugItem_status);
		
		debugDataNode.appendChild(newDebugItem);
		
		let noErrorToShow = document.querySelector("#noErrorToShow");
		hideClassNode(noErrorToShow);
		
		scrollbar_update("debugSection");
	}
}
function streamItemClick(){
	let node = this;
	let id = node.dataset.streamId;
	let contentId = node.dataset.contentId;
	//let online = node.dataset.online;
	let website = node.dataset.streamWebsite;
	
	let streamUrl = getStreamURL(website, id, contentId, true);
	if(streamChangeMode === false && streamUrl !==null && streamUrl !== ""){
		sendDataToMain("openTab", streamUrl);
	}
}

function current_version(version){
	let current_version_node = document.querySelector("#current_version");
	//current_version_node.textContent = version;
	current_version_node.dataset.currentVersion = version;
}

function theme_update(){
	let panelColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));
	
	if(typeof panelColorStylesheet === "object" && panelColorStylesheet !== null){
		console.info("Theme update");
		
		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.parentNode.removeChild(currentThemeNode);

		document.querySelector("body").dataset.theme = panelColorStylesheet.dataset.theme;

		document.querySelector("head").appendChild(panelColorStylesheet);
	}
}

backgroundPage.panel__UpdateData = (data)=>{
	updatePanelData(data);
};

let scrollbar = {"streamList": null, "settings_container": null};
function load_scrollbar(id){
	let scroll_node = document.querySelector(`#${id}`);

	if(scroll_node === null) {
		console.warn(`[Live notifier] Unkown scrollbar id (${id})`);
		return null;
	}
	
	$(scroll_node).perfectScrollbar({
		theme: "slimScrollbar",
		suppressScrollX: true
	});
	/*
	Ps.initialize(scroll_node, {
		theme: "slimScrollbar",
		suppressScrollX: true
	});*/
}

function scrollbar_update(nodeId){
	if(typeof nodeId === "string" && nodeId !== ""){
		let scrollbar_node = document.querySelector(`#${nodeId}`);
		if(scrollbar_node !== null){
			$(scrollbar_node).perfectScrollbar('update');
			//Ps.update(scrollbar_node);
		}
	}
}

loadTranslations();

sendDataToMain("panel_onload");

load_scrollbar("streamList");
load_scrollbar("streamEditor");
load_scrollbar("settings_container");
load_scrollbar("debugSection");

window.onresize = _.debounce(event=>{
		scrollbar_update("streamList");
		scrollbar_update("streamEditor");
		scrollbar_update("settings_container");
		scrollbar_update("debugSection");
	}, 100, {
		maxWait: 200
	})
;

