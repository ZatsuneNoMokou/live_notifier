'use strict';

// Avoid keeping init node in memory
let panelinitjs_node = document.querySelector("#panelInit");
panelinitjs_node.parentNode.removeChild(panelinitjs_node)


function sendDataToMain(id, data){
	function responseCallback(response){
		if(typeof response != "undefined"){
			console.group();
			console.info(`Port response of ${id}: `);
			console.groupEnd();
		}
	}
	chrome.runtime.sendMessage({"sender": "Live_Notifier_Panel","receiver": "Live_Notifier_Main", "id": id, "data": data}, responseCallback);
}

var backgroundPage = chrome.extension.getBackgroundPage();

var theme_cache_update = backgroundPage.backgroundTheme.theme_cache_update;

let options = backgroundPage.optionsData.options;
let options_default = backgroundPage.optionsData.options_default;
let options_default_sync = backgroundPage.optionsData.options_default_sync;

let appGlobal = backgroundPage.appGlobal;

let streamListFromSetting = appGlobal.streamListFromSetting;
let websites = appGlobal.websites;
let liveStatus = appGlobal.liveStatus;
let channelInfos = appGlobal.channelInfos;
let getCleanedStreamStatus = appGlobal.getCleanedStreamStatus;
let getStreamURL = appGlobal.getStreamURL;
let getOfflineCount = appGlobal.getOfflineCount;
let doStreamNotif = appGlobal.doStreamNotif;
let setIcon = appGlobal.setIcon;

let checkMissing = appGlobal.checkMissing;

let _ = chrome.i18n.getMessage;

var refreshStreamsButton = document.querySelector("#refreshStreams");

function refreshButtonClick(){
	sendDataToMain("refreshStreams","");
}
refreshStreamsButton.addEventListener("click",refreshButtonClick,false);

var addStreamButton = document.querySelector("#addStream");

function addStreamButtonClick(){
	sendDataToMain("addStream","");
}
addStreamButton.addEventListener("click",addStreamButtonClick,false);

function allowDrop(event){
	event.preventDefault();
}
function drag(event) {
	let node = event.target;
	if(node.draggable == true && node.dataset.streamId != null){
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
	if(event.target.classList.contains('dragover') == true){
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.classList.add("active");
	}
}
function dragleave(event){
	if(event.target.classList.contains('dragover') == false){//Chrome only: FALSE
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
let deleteStreamTooltip = document.querySelector("#deleteStreamTooltip");
let showDeleteTooltip = false;
function deleteStreamButtonClick(){
	if(!showDeleteTooltip){
		showDeleteTooltip = true;
		deleteStreamTooltip.classList.remove("hide");
		setTimeout(function() {
			showDeleteTooltip = false;
			deleteStreamTooltip.classList.add("hide");
		}, 1250);
	}
	
	document.querySelector("#streamList").classList.toggle("deleteButtonMode");
}
deleteStreamButton.addEventListener("click", deleteStreamButtonClick, false);

/*				---- Search Button ----				*/
let toggle_search_button = document.querySelector("button#searchStream");
let searchInput_onInput_Loaded = false;
function searchContainer_Toggle(){
	let searchInputContainer = document.querySelector("#searchInputContainer");
	let hiddenClass = /\s*hide/i;
	
	let searchInput = document.querySelector("input#searchInput");
	if(!searchInput_onInput_Loaded){
		searchInput.addEventListener("input", searchInput_onInput);
		
		let searchLabel = document.querySelector("#searchInputContainer label");
		searchLabel.addEventListener("click", searchInput_onInput);
	}
	
	searchInputContainer.classList.toggle("hide");
	searchInput.value = "";
	searchInput_onInput();
	
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
function selectSection(sectionNodeId){
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	let debugSection = document.querySelector("section#debugSection");
	
	if(typeof sectionNodeId == "string" && sectionNodeId != ""){
		let sectionList = [streamList, streamEditor, settings_node, debugSection];
		
		let sectionEnabled = false;
		for(let i in sectionList){
			if(sectionList[i].id == sectionNodeId){
				sectionEnabled = true;
				unhideClassNode(sectionList[i]);
				scrollbar_update(sectionNodeId);
				
				switch(sectionNodeId){
					case "streamList":
						setting_Enabled = false;
						sendDataToMain("refreshPanel", "");
						break;
					case "settings_container":
						setting_Enabled = true;
						break;
				}
			} else {
				hideClassNode(sectionList[i]);
			}
		}
		if(sectionEnabled == false){
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

if(typeof chrome.storage.sync == "object"){
	document.querySelector("#syncContainer").classList.remove("hide");
	
	let restaure_sync_button = document.querySelector("#restaure_sync");
	restaure_sync_button.addEventListener("click", function(event){restaureOptionsFromSync(event);});
	
	let save_sync_button = document.querySelector("#save_sync");
	save_sync_button.addEventListener("click", function(event){saveOptionsInSync(event);});
}

/*				---- Debug section ----				*/

let close_debugSection = document.querySelector("#close_debugSection");
close_debugSection.addEventListener("click", function(event){
	selectSection("streamList");
}, false);

let versionNode = document.querySelector("#current_version");
versionNode.addEventListener("dblclick", enableDebugSection);

function enableDebugSection(){
	selectSection("debugSection");
}

/*				---- End Debug section ----				*/

/*				---- Setting nodes generator ----				*/

loadPreferences("section#settings_container #preferences");

/*			---- Settings end ----			*/

/*			---- Stream Editor----			*/

let closeEditorButton = document.querySelector("#closeEditor");
closeEditorButton.addEventListener("click", function(event){
	selectSection("streamList");
}, false);

let saveEditedStreamButton = document.querySelector("#saveEditedStream");
function saveEditedStreamButton_onClick(event){
	let node = this;
	
	let website = node.dataset.website;
	let id = node.dataset.id;
	let contentId = node.dataset.contentId;
	
	let customURL_node = document.querySelector("#customURL");
	
	function removeEmplyItems(obj){
		for(let i in obj){
			if(obj[i] == "" /* || /^\s+$/ */){
				delete obj[i];
			}
		}
		return obj;
	}
	
	let streamSettingsData = {
		streamURL: (customURL_node.validity.valid == true)? customURL_node.value : "",
		statusBlacklist: removeEmplyItems(document.querySelector("#streamEditor #status_blacklist").value.split('\n')),
		statusWhitelist: removeEmplyItems(document.querySelector("#streamEditor #status_whitelist").value.split('\n')),
		gameBlacklist: removeEmplyItems(document.querySelector("#streamEditor #game_blacklist").value.split('\n')),
		gameWhitelist: removeEmplyItems(document.querySelector("#streamEditor #game_whitelist").value.split('\n')),
		twitter: document.querySelector("#streamEditor #twitter").value,
		hide: document.querySelector("#streamEditor #hideStream").checked,
		ignore: document.querySelector("#streamEditor #ignoreStream").checked,
		iconIgnore: document.querySelector("#streamEditor #iconIgnore").checked,
		notifyOnline: document.querySelector("#streamEditor #notifyOnline").checked,
		notifyOffline: document.querySelector("#streamEditor #notifyOffline").checked
	}
	
	sendDataToMain("streamSetting_Update", {
		website: website,
		id: id,
		contentId: contentId,
		streamSettingsData: streamSettingsData
	});
}
saveEditedStreamButton.addEventListener("click", saveEditedStreamButton_onClick, false);

/*			---- Stream Editor end----			*/

function updatePanelData(data){
	console.log("Updating panel data");
	
	if(typeof data.doUpdateTheme == "boolean" && data.doUpdateTheme == true){
		theme_update();
	}
	
	//Clear stream list in the panel
	initList({"group_streams_by_websites": getPreference("group_streams_by_websites"), "show_offline_in_panel": getPreference("show_offline_in_panel")});
	
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
						doStreamNotif(website, id, contentId, streamList.get(id), streamData.liveStatus.API_Status);
						
						listener(website, id, contentId, "live", streamList.get(id), streamData);
					}
				})
			} else {
				if(channelInfos.has(website) && channelInfos.get(website).has(id)){
					let streamData = channelInfos.get(website).get(id);
					let contentId = id;
					
					console.info(`Using channel infos for ${id} (${website})`);
					
					listener(website, id, contentId, "channel", streamList.get(id), channelInfos.get(website).get(id));
				} else if(websites.has(website)){
					console.info(`Currrently no data for ${id} (${website})`);
				} else {
					let contentId = id;
					let streamData = {"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
					console.warn(`The website of ${id} ("${website}") is not supported or not loaded`);
					listener(website, id, contentId, "unsupported", streamList.get(id), streamData);
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
	let onlineCount = appGlobal["onlineCount"];
	listenerOnlineCount((onlineCount == 0)? _("No_stream_online") :  _("count_stream_online", onlineCount.toString()));
	
	if(getPreference("show_offline_in_panel")){
		var offlineCount = getOfflineCount();
		listenerOfflineCount((offlineCount == 0)? _("No_stream_offline") :  _("count_stream_offline", offlineCount.toString()));
	} else {
		listenerOfflineCount("");
	}
	
	let debug_checkingLivesState_node = document.querySelector("#debug_checkingLivesState");
	debug_checkingLivesState_node.className = appGlobal["checkingLivesFinished"];
	
	//Update Live notifier version displayed in the panel preferences
	if(typeof appGlobal["version"] == "string"){
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
			let node = streamItems[i];
			if(typeof node.removeChild != "undefined"){
				node.removeEventListener("click", streamItemClick);
				node.parentNode.removeChild(node);
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
	let id = node.dataset.id;
	let website = node.dataset.website;
	
	sendDataToMain("deleteStream", {id: id, website: website});
}
function newDeleteStreamButton(id, website){
	let node = document.createElement("span");
	node.classList.add("deleteStreamButton");
	node.dataset.id = id;
	node.dataset.website = website;
	
	return node;
}
function newShareStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let website = node.dataset.website;
	let id = node.dataset.id;
	let contentId = node.dataset.contentId;
	
	sendDataToMain("shareStream", {
		website: node.dataset.website,
		id: node.dataset.id,
		contentId: node.dataset.contentId,
	});
}
function newShareStreamButton(id, contentId, website, streamName, streamUrl, streamStatus, facebookID, twitterID){
	let node = document.createElement("span");
	node.classList.add("shareStreamButton");
	node.dataset.website = website;
	node.dataset.id = id;
	node.dataset.contentId = contentId;
	
	return node;
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
	document.querySelector("#streamEditor #hideStream").checked = (typeof streamSettings.hide == "boolean")? streamSettings.hide : false;
	document.querySelector("#streamEditor #ignoreStream").checked = (typeof streamSettings.ignore == "boolean")? streamSettings.ignore : false;
	document.querySelector("#streamEditor #iconIgnore").checked = (typeof streamSettings.iconIgnore == "boolean")? streamSettings.iconIgnore : false;
	document.querySelector("#streamEditor #notifyOnline").checked = (typeof streamSettings.notifyOnline == "boolean")? streamSettings.notifyOnline : true;
	document.querySelector("#streamEditor #notifyOffline").checked = (typeof streamSettings.notifyOffline == "boolean")? streamSettings.notifyOffline : false;
	
	unhideClassNode(streamEditor);
	scrollbar_update("streamEditor");
}
function newEditStreamButton(id, contentId, website, title, streamSettings){
	let node = document.createElement("span");
	node.classList.add("editStreamButton");
	node.dataset.id = id;
	node.dataset.contentId = contentId;
	node.dataset.website = website;
	node.dataset.title = title;
	node.dataset.streamSettings = JSON.stringify(streamSettings);
	
	return node;
}
function newCopyLivestreamerCmdButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.dataset.id;
	let contentId = node.dataset.contentId;
	let website = node.dataset.website;
	
	sendDataToMain("copyLivestreamerCmd", {id: id, contentId: contentId, website: website});
}
function newCopyLivestreamerCmdButton(id, contentId, website){
	let node = document.createElement("span");
	node.classList.add("copyLivestreamerCmdButton");
	node.dataset.id = id;
	node.dataset.contentId = contentId;
	node.dataset.website = website;
	
	return node;
}

let streamNodes = {
	"online": {
		"beam": document.querySelector("#streamListOnline .beam"),
		"dailymotion": document.querySelector("#streamListOnline .dailymotion"),
		"hitbox": document.querySelector("#streamListOnline .hitbox"),
		"twitch": document.querySelector("#streamListOnline .twitch"),
		"youtube": document.querySelector("#streamListOnline .youtube")
	},
	"offline": {
		"beam": document.querySelector("#streamListOffline .beam"),
		"dailymotion": document.querySelector("#streamListOffline .dailymotion"),
		"hitbox": document.querySelector("#streamListOffline .hitbox"),
		"twitch": document.querySelector("#streamListOffline .twitch"),
		"youtube": document.querySelector("#streamListOffline .youtube")
	}
}

function showNonEmptySitesBlocks(){
	let current_node;
	for(let onlineStatus in streamNodes){
		for(let website in streamNodes[onlineStatus]){
			current_node = streamNodes[onlineStatus][website];
			current_node.classList.remove("hide");
			if(!current_node.hasChildNodes()){
				current_node.classList.add("hide");
			}
		}
	}
	let unsupportedWebsiteNodes = ["#streamListOnline .unsupported", "#streamListOffline .unsupported"]
	unsupportedWebsiteNodes.forEach((selector, index, array) => {
		let node  = document.querySelector(selector)
		node.classList.remove("hide");
		if(!node.hasChildNodes()){
			node.classList.add("hide");
		}
	})
}
function insertStreamNode(newLine, website, id, contentId, type, streamData, online){
	let statusNode;
	let statusStreamList;
	
	if(online){
		statusNode = document.querySelector("#streamListOnline");
		statusStreamList = document.querySelectorAll("#streamListOnline .item-stream");
	} else {
		statusNode = document.querySelector("#streamListOffline");
		statusStreamList = document.querySelectorAll("#streamListOffline .item-stream");
	}
	
	if(group_streams_by_websites){
		if(streamNodes.hasOwnProperty(((online)? "online" : "offline")) && streamNodes[((online)? "online" : "offline")].hasOwnProperty(website)){
			streamNodes[((online)? "online" : "offline")][website].appendChild(newLine);
		} else {
			document.querySelector(`#streamList${((online)? "Online" : "Offline")} .unsupported`).appendChild(newLine);
		}
		return true;
	} else {
		if(statusStreamList.length > 0){
			for(let i in statusStreamList){
				let streamNode = statusStreamList[i];
				if(typeof streamNode.tagName == "string"){
					let streamNode_title = streamNode.dataset.streamName;
					if(streamData.streamName.toLowerCase() < streamNode_title.toLowerCase()){
						streamNode.parentNode.insertBefore(newLine,streamNode);
						return true;
					}
				}
			}
		}
		statusNode.appendChild(newLine);
		return true;
	}
}

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
	
	let streamName = streamData.streamName;
	let streamStatus = streamData.streamStatus;
	let streamGame = streamData.streamGame;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamCurrentViewers = streamData.streamCurrentViewers;
	let streamUrl = (type == "live" || type == "channel")? getStreamURL(website, id, contentId, true) : "";
	let facebookID = streamData.facebookID;
	let twitterID = streamData.twitterID;
	
	var newLine = document.createElement("div");
	newLine.id = `${website}/${id}/${contentId}`;
	
	let stream_right_container_node;
	if(online){
		stream_right_container_node = document.createElement("span");
		stream_right_container_node.id = "stream_right_container";
		newLine.appendChild(stream_right_container_node);
		
		if(online && typeof streamCurrentViewers == "number"){
			var viewerCountNode = document.createElement("span");
			viewerCountNode.classList.add("streamCurrentViewers");
			
			let viewer_number = (typeof streamCurrentViewers == "number")? streamCurrentViewers : parseInt(streamCurrentViewers);
			viewerCountNode.dataset.streamCurrentViewers = (viewer_number < 1000)? viewer_number : ((Math.round(viewer_number / 100)/10) + "k");
			
			stream_right_container_node.appendChild(viewerCountNode);
		}
	}
	
	let streamLogo = "";
	
	if(online && typeof streamCategoryLogo == "string" && streamCategoryLogo != ""){
		streamLogo  = streamCategoryLogo;
	} else if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	if(typeof streamLogo == "string" && streamLogo != ""){
		newLine.style.backgroundImage = "url('" + streamLogo + "')";
		newLine.classList.add("streamLogo");
	}

	var titleLine = document.createElement("span");
	titleLine.classList.add("streamTitle");
	if(typeof streamLogo == "string" && streamLogo != ""){
		var imgStreamStatusLogo = document.createElement("img");
		imgStreamStatusLogo.classList.add("streamStatusLogo");
		imgStreamStatusLogo.src = (online)? "online-stream.svg" : "offline-stream.svg";
		titleLine.appendChild(imgStreamStatusLogo);
	}
	titleLine.textContent = streamName;
	newLine.appendChild(titleLine);
	
	if(online){
		if(streamStatus != ""){
			var statusLine = document.createElement("span");
			statusLine.classList.add("streamStatus");
			statusLine.textContent = streamStatus + ((streamGame.length > 0)? (" (" + streamGame + ")") : "");
			newLine.appendChild(statusLine);
			
			newLine.dataset.streamStatus = streamStatus;
			newLine.dataset.streamStatusLowercase = streamStatus.toLowerCase();
		}
		
		if(streamGame.length > 0){
			newLine.dataset.streamGame = streamGame;
			newLine.dataset.streamGameLowercase = streamGame.toLowerCase();
		}
		
		newLine.classList.add("item-stream", "onlineItem");
		insertStreamNode(newLine, website, id, contentId, type, streamData, online);
	} else {
		newLine.classList.add("item-stream", "offlineItem");
		insertStreamNode(newLine, website, id, contentId, type, streamData, online);
	}
	newLine.classList.add("cursor");
	
	newLine.dataset.streamId = id;
	newLine.dataset.contentId = contentId;
	newLine.dataset.online = online;
	newLine.dataset.streamName = streamName;
	newLine.dataset.streamNameLowercase = streamName.toLowerCase();
	newLine.dataset.streamWebsite = website;
	newLine.dataset.streamWebsiteLowercase = website.toLowerCase();
	newLine.dataset.streamUrl = streamUrl;
	newLine.dataset.streamType = type;
	
	newLine.dataset.streamSettings = JSON.stringify(streamSettings);
	
	if(typeof facebookID == "string" && facebookID != ""){
		newLine.dataset.facebookId = facebookID;
	}
	if(typeof twitterID == "string" && twitterID != ""){
		newLine.dataset.twitterId = twitterID;
	}
	newLine.addEventListener("click", streamItemClick);
	
	/*			---- Control span ----			*/
	let control_span = document.createElement("span");
	control_span.classList.add("stream_control");
	let deleteButton_node = newDeleteStreamButton(id, website);
	control_span.appendChild(deleteButton_node);
	
	let copyLivestreamerCmd_node = null;
	let editStream_node = null;
	let shareStream_node = null;
	if(type == "live"){
		copyLivestreamerCmd_node = newCopyLivestreamerCmdButton(id, contentId, website);
		control_span.appendChild(copyLivestreamerCmd_node);
	}
	editStream_node = newEditStreamButton(id, contentId, website, streamName, streamSettings);
	control_span.appendChild(editStream_node);
	if(online){
		shareStream_node = newShareStreamButton(id, contentId, website, streamName, streamUrl, streamStatus, (typeof facebookID == "string")? facebookID: "", (typeof twitterID == "string")? twitterID: "");
		control_span.appendChild(shareStream_node);
		
		stream_right_container_node.appendChild(control_span);
	} else {
		newLine.appendChild(control_span);
	}
	deleteButton_node.addEventListener("click", newDeleteStreamButton_onClick, false);
	if(copyLivestreamerCmd_node !== null){
		copyLivestreamerCmd_node.addEventListener("click", newCopyLivestreamerCmdButton_onClick, false);
	}
	if(editStream_node !== null){
		editStream_node.addEventListener("click", newEditStreamButton_onClick, false);
	}
	if(shareStream_node !== null){
		shareStream_node.addEventListener("click", newShareStreamButton_onClick, false);
	}
	
	newLine.draggable = true;
	
	showNonEmptySitesBlocks();
	scrollbar_update("streamList");
	
	if(typeof liveStatus.lastCheckStatus == "string" && liveStatus.lastCheckStatus != "" && liveStatus.lastCheckStatus != "success"){
		let debugDataNode = document.querySelector("#debugData");
		let newDebugItem = document.createElement('div');
		newDebugItem.classList.add("debugItem");
		newDebugItem.dataset.streamWebsite = website;
		
		let newDebugItem_title = document.createElement('span');
		newDebugItem_title.classList.add("debugTitle");
		newDebugItem_title.textContent = streamName;
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
	let online = node.dataset.online;
	let website = node.dataset.streamWebsite;
	let streamUrl = node.dataset.streamUrl;
	
	if(streamUrl != ""){
		if(online){
			sendDataToMain("openOnlineLive", {id: id, website: website, streamUrl: streamUrl});
		} else {
			sendDataToMain("openTab", streamUrl);
		}
	}
}

function current_version(version){
	let current_version_node = document.querySelector("#current_version");
	current_version_node.textContent = version;
}

function theme_update(){
	let panelColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));
	
	if(typeof panelColorStylesheet == "object" && panelColorStylesheet !== null){
		console.info("Theme update");
		
		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.parentNode.removeChild(currentThemeNode);
		
		document.querySelector("head").appendChild(panelColorStylesheet);
	}
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
	if(message.receiver == "Live_Notifier_Panel"){
		console.group()
		console.info("Message:");
		console.dir(message);
		console.groupEnd();
		
		let id = message.id;
		let data = message.data;
		
		switch(id){
			case "updatePanelData":
				updatePanelData(data);
				break;
		}
	}
});

let scrollbar = {"streamList": null, "settings_container": null};
function load_scrollbar(id){
	let scroll_node;
	if(id == "streamList"){
		scroll_node = document.querySelector('#streamList');
	} else if(id == "settings_container"){
		scroll_node = document.querySelector('#settings_container');
	} else if(id == "streamEditor"){
		scroll_node = document.querySelector('#streamEditor');
	} else if(id == "debugSection"){
		scroll_node = document.querySelector('#debugSection');
	} else {
		console.warn(`[Live notifier] Unkown scrollbar id (${id})`);
		return null;
	}
	
	Ps.initialize(scroll_node, {
		theme: "slimScrollbar",
		suppressScrollX: true
	});
}

function scrollbar_update(nodeId){
	if(typeof nodeId == "string" && nodeId != ""){
		let scrollbar_node = document.querySelector(`#${nodeId}`);
		if(scrollbar_node != null){
			Ps.update(scrollbar_node);
		}
	}
}

sendDataToMain("panel_onload","");

translateNodes(document);
translateNodes_title(document);

load_scrollbar("streamList");
load_scrollbar("streamEditor");
load_scrollbar("settings_container");
load_scrollbar("debugSection");

window.onresize = function(){
	scrollbar_update("streamList");
	scrollbar_update("streamEditor");
	scrollbar_update("settings_container");
	scrollbar_update("debugSection");
}
