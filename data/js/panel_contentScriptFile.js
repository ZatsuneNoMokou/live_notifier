/*function unloadListeners() {
	let refreshStreamsButton = document.querySelector("#refreshStreams");
	refreshStreamsButton.removeEventListener("click",refreshButtonClick);
	
	let addStreamButton = document.querySelector("#addStream");
	addStreamButton.removeEventListener("click",addStreamButtonClick);
	
	let deleteStreamButton = document.querySelector("#deleteStream");
	deleteStreamButton.removeEventListener("click",deleteStreamButtonClick);
	
	self.port.removeListener('initList', initList);
	self.port.removeListener('updateOnlineCount', listenerOnlineCount);
	self.port.removeListener('updateOfflineCount', listenerOfflineCount);
	self.port.removeListener('updateData', listener);
	self.port.removeListener('panel_theme', theme_update);
	self.port.removeListener('unloadListeners', unloadListeners);
}*/

/*				---- Global functions ----				*/
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
function getBooleanFromVar(string){
	switch(typeof string){
		case "boolean":
			return string;
			break;
		case "number":
		case "string":
			if(string == "true" || string == "on" || string == 1){
				return true;
			} else if(string == "false" || string == "off" || string == 0){
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
function getValueFromNode(node){
	let tagName = node.tagName.toLowerCase();
	if(tagName == "textarea"){
		if(node.dataset.stringTextarea == "true"){
			return node.value.replace(/\n/g, "");
		} else if(node.dataset.stringList == "true"){
			let list = node.value.split("\n");
			for(let i in list){
				list[i] = encodeString(list[i]);
			}
			return list.join(",");
		} else {
			return node.value;
		}
	} else if(node.type == "checkbox"){
		return node.checked;
	} else if(tagName == "input" && node.type == "number"){
		return parseInt(node.value);
	} else if(typeof node.value == "string"){
		return node.value;
	} else {
		console.error("Problem with node trying to get value");
	}
}
/*			---- Global functions end ----			*/


//self.port.on('unloadListeners', unloadListeners);

var refreshStreamsButton = document.querySelector("#refreshStreams");

function refreshButtonClick(){
	self.port.emit("refreshStreams","");
}
refreshStreamsButton.addEventListener("click",refreshButtonClick,false);

var addStreamButton = document.querySelector("#addStream");

function addStreamButtonClick(){
	self.port.emit("addStream","");
}
addStreamButton.addEventListener("click",addStreamButtonClick,false);

function allowDrop(event){
	event.preventDefault();
}
function drag(event) {
	let node = event.target;
	if(node.draggable = true && node.dataset.streamId !== null){
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
	
	self.port.emit("deleteStream", {id: data.id, website: data.website});
}
function dragenter(event){
	if(event.target.classList.contains('dragover') == true){
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.classList.add("active");
	}
}
function dragleave(event){
	if(event.target.classList.contains('dragover') == true){//Firefox only: TRUE
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
let showDeleteTooltip = false;
function deleteStreamButtonClick(){
	let deleteStreamTooltip = document.querySelector("#deleteStreamTooltip");
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
deleteStreamButton.addEventListener("click",deleteStreamButtonClick,false);

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
	
	scrollbar_update("streamList");
}
toggle_search_button.addEventListener("click", searchContainer_Toggle);

function searchInput_onInput(){
	let searchInput = document.querySelector("input#searchInput");
	let somethingElseThanSpaces = /[^\s]+/;
	let search = searchInput.value.toLowerCase();
	let searchCSS_Node = document.querySelector("#search-cssSelector");
	if(search.length > 0 && somethingElseThanSpaces.test(search)){
		searchCSS_Node.textContent =  `
.item-stream:not([data-stream-name-lowercase*="${search}"]):not([data-stream-status-lowercase*="${search}"]):not([data-stream-game-lowercase*="${search}"]):not([data-stream-website-lowercase*="${search}"]){
	display: none;
	visibility: hidden;
}
`;
	} else {
		searchCSS_Node.textContent = "";
		searchInput.value = "";
		searchInput_onInput();
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
						self.port.emit("refreshPanel", "");
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
		setting_Enabled = false;
		selectSection("streamList");
	} else {
		setting_Enabled = true;
		selectSection("settings_container");
	}
}
settings_button.addEventListener("click", setting_Toggle, false);

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
function loadPreferences(){
	let container = document.querySelector("section#settings_container #preferences");
	
	for(let id in options){
		let option = options[id];
		if(typeof option.type == "undefined" || option.type == "hidden"){
			continue;
		}
		if(typeof option.showPrefInPanel == "boolean" && option.showPrefInPanel == false){
			continue;
		}
		
		let groupNode = null;
		if(typeof option.group == "string" && option.group != ""){
			groupNode = getPreferenceGroupNode(container, option.group);
		}
		
		newPreferenceNode(((groupNode == null)? container : groupNode), id, option);
	}
}
function getPreferenceGroupNode(parent, groupId){
	let groupNode = document.querySelector(`#${groupId}.pref_group`);
	if(groupNode == null){
		groupNode = document.createElement("p");
		groupNode.id = groupId;
		groupNode.classList.add("pref_group");
		if(groupId == "dailymotion" || groupId == "hitbox" || groupId == "twitch" || groupId == "beam"){
			groupNode.classList.add("website_pref");
		}
		parent.appendChild(groupNode);
	}
	return groupNode;
}
function import_onClick(){
	let getWebsite = /^(\w+)_import$/i;
	let website = getWebsite.exec(this.id)[1];
	self.port.emit("importStreams", website);
}
function newPreferenceNode(parent, id, prefObj){
	let node = document.createElement("div");
	node.classList.add("preferenceContainer");
	
	let labelNode = document.createElement("label");
	labelNode.classList.add("preference");
	if(typeof prefObj.description == "string"){
		labelNode.title = prefObj.description;
	}
	labelNode.htmlFor = id;
	labelNode.dataset.translateTitle = `${id}_description`;
	
	let title = document.createElement("span");
	title.id = `${id}_title`;
	title.textContent = prefObj.title;
	title.dataset.l10nId = `${id}_title`;
	labelNode.appendChild(title);
	
	self.port.emit("translate", JSON.stringify({"translate-node-id": `#${id}_title`, "data-l10n-id": `${id}_title`}));
	
	let prefNode = null;
	switch(prefObj.type){
		case "string":
			if(typeof prefObj.stringList == "boolean" && prefObj.stringList == true){
				prefNode = document.createElement("textarea");
				prefNode.dataset.stringList = true;
				//prefNode.value = getFilterListFromPreference(getPreferences(id)).join("\n");
				
				node.classList.add("stringList");
			} else {
				prefNode = document.createElement("input");
				prefNode.type = "text";
				//prefNode.value = getPreferences(id);
			}
			break;
		case "integer":
			prefNode = document.createElement("input");
			prefNode.type = "number";
			//prefNode.value = parseInt(getPreferences(id));
			break;
		case "bool":
			prefNode = document.createElement("input");
			prefNode.type = "checkbox";
			//prefNode.checked = getBooleanFromVar(getPreferences(id));
			break;
		case "color":
			prefNode = document.createElement("input");
			prefNode.type = "color";
			//prefNode.value = getPreferences(id);
			break;
		case "control":
			prefNode = document.createElement("button");
			prefNode.textContent = prefObj.label;
			break;
		case "menulist":
			prefNode = document.createElement("select");
			prefNode.size = 2;
			for(let o in prefObj.options){
				let option = prefObj.options[o];
				
				let optionNode = document.createElement("option");
				optionNode.id = option.value;
				optionNode.text = option.label;
				optionNode.value = option.value;
				optionNode.dataset.l10nId = `${id}_options.${option.label}`;
				
				self.port.emit("translate", JSON.stringify({"translate-node-id": `#${id} #${option.value}`, "data-l10n-id": `${id}_options.${option.label}`}));
				
				prefNode.add(optionNode);
			}
			//prefNode.value = getPreferences(id);
			break;
	}
	prefNode.id = id;
	if(prefObj.type != "control"){
		prefNode.classList.add("preferenceInput");
	}
	if(prefObj.type == "control"){
		self.port.emit("translate", JSON.stringify({"translate-node-id": `#${id}`, "data-l10n-id": `${id}_label`}));
	}
	if(id.indexOf("_keys_list") != -1 || id.indexOf("_user_id") != -1 || id == "statusBlacklist" || id == "statusWhitelist" || id == "gameBlacklist" || id == "gameWhitelist"){
		node.classList.add("flex_input_text");
	}
	prefNode.dataset.settingType = prefObj.type;
	
	if(prefObj.type != "menulist"){
		prefNode.dataset.l10nId = id;
	}
	
	node.appendChild(labelNode);
	node.appendChild(prefNode);
	parent.appendChild(node);
	
	switch(prefObj.type){
		case "string":
			prefNode.addEventListener("input", settingNode_onChange, false);
			break;
		case "integer":
		case "bool":
		case "color":
		case "menulist":
			prefNode.addEventListener("change", settingNode_onChange, false);
			break;
		case "control":
			if(id == "export_preferences"){
				prefNode.addEventListener("click", getSyncPreferences);
			} else if(id == "import_preferences"){
				prefNode.addEventListener("click", importPrefsFromFile);
			} else if(id.indexOf("_import") != -1){
				prefNode.addEventListener("click", import_onClick);
			}
			break;
	}
}
loadPreferences();

function initSettings(){
	self.port.emit("refreshPanel","");
}


function settingNode_onChange(event){
	let node = this;
	let setting_Name = this.id;
	let value = getValueFromNode(node);
	if(setting_Name == "check_delay" && value < 1){
		value = 1;
	}
	
	let updatePanel = true
	// if(event.type == "input" && this.tagName == "INPUT" && this.type == "text"){
	if(event.type == "input"){
		updatePanel = false;
	}
	self.port.emit("setting_Update", {settingName: setting_Name, settingValue: value, updatePanel: updatePanel});
	
	if(updatePanel){
		self.port.emit("refreshPanel", {});
	}
}

function settingNodesUpdate(data){
	let settingNode = document.querySelector(`#${data.settingName}`);
	if(settingNode !== null){
		switch(options[data.settingName].type){
			case "string":
				if(typeof options[data.settingName].stringList == "boolean" && options[data.settingName].stringList == true){
					settingNode.value = getFilterListFromPreference(data.settingValue).join("\n");
				} else {
					settingNode.value = data.settingValue;
				}
				break;
			case "color":
			case "menulist":
				settingNode.value = data.settingValue;
				break;
			case "integer":
				settingNode.value = parseInt(data.settingValue);
				break;
			case "bool":
				settingNode.checked = getBooleanFromVar(data.settingValue);
				break;
			case "control":
				// Nothing to update, no value
				break;
		}
	} else {
		console.warn(`${data.settingName} node is null`);
	}
}
function getSyncPreferences(){
	self.port.emit("getSyncPreferences", options_default_sync);
}
function exportPrefsToFile(data){
	let exportData = {
		"live_notifier_version": current_version,
		"preferences": data
	}
	
	let link = document.createElement("a");
	link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData));
	link.download = "live_notifier_preferences.json";
	
	document.querySelector("body").appendChild(link);
	link.click();
	link.parentNode.removeChild(link);
}
function importPrefsFromFile(event){
	let node = document.createElement("input");
	node.type = "file";
	node.addEventListener("change", function(){
		let fileLoader=new FileReader();
		if(node.files.length == 0 || node.files.length > 1){
			console.warn(`[Input error] ${node.files.length} file(s) selected `);
		} else {
			fileLoader.readAsText(node.files[0]);
			fileLoader.onloadend = function(event){
				let rawFileData = event.target.result;
				let file_JSONData = null;
				try{
					file_JSONData = JSON.parse(rawFileData);
				}
				catch(error){
					if(new String(error).indexOf("SyntaxError") != -1){
						console.warn(`An error occurred when trying to parse file (Check the file you have used)`);
					} else {
						console.warn(`An error occurred when trying to parse file (${error})`);
					}
				}
				let preferences = {};
				if(file_JSONData != null){
					if(file_JSONData.hasOwnProperty("live_notifier_version") == true && file_JSONData.hasOwnProperty("preferences") == true && typeof file_JSONData.preferences == "object"){
						for(let prefId in file_JSONData.preferences){
							if(typeof options[prefId].type != "undefined" && options[prefId].type != "control" && options[prefId].type != "file" && typeof file_JSONData.preferences[prefId] == typeof options_default_sync[prefId]){
								preferences[prefId] = file_JSONData.preferences[prefId];
							} else {
								console.warn(`Erreur trying to import ${prefId}`);
							}
						}
						self.port.emit("importPrefsFromFile", preferences);
					}
				}
			}
		}
	});
	node.click();
}
/*			---- Settings end ----			*/

/*			---- Stream Editor----			*/

let closeEditorButton = document.querySelector("#closeEditor");
closeEditorButton.addEventListener("click", function(event){
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	
	unhideClassNode(streamList);
	hideClassNode(streamEditor);
	hideClassNode(settings_node);
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
		notifyOnline: document.querySelector("#streamEditor #notifyOnline").checked,
		notifyOffline: document.querySelector("#streamEditor #notifyOffline").checked
	}
	
	self.port.emit("streamSetting_Update", {
		website: website,
		id: id,
		contentId: contentId,
		streamSettingsData: streamSettingsData
	});
}
saveEditedStreamButton.addEventListener("click", saveEditedStreamButton_onClick, false);

/*			---- Stream Editor end----			*/


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
	for(let node of streamItems){
		node.removeEventListener("click", streamItemClick);
		node.parentNode.removeChild(node);
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
	
	self.port.emit("deleteStream", {id: id, website: website});
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
	
	self.port.emit("shareStream", {
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
	
	self.port.emit("copyLivestreamerCmd", {id: id, contentId: contentId, website: website});
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
		"twitch": document.querySelector("#streamListOnline .twitch")
	},
	"offline": {
		"beam": document.querySelector("#streamListOffline .beam"),
		"dailymotion": document.querySelector("#streamListOffline .dailymotion"),
		"hitbox": document.querySelector("#streamListOffline .hitbox"),
		"twitch": document.querySelector("#streamListOffline .twitch")
	}
}

function showNonEmptySitesBlocks(){
	let current_node;
	for(let onlineStatus in streamNodes){
		for(let website in streamNodes[onlineStatus]){
			current_node = streamNodes[onlineStatus][website];
			current_node.classList.remove("hide");
			if(current_node.hasChildNodes() == false){
				current_node.classList.add("hide");
			}
		}
	}
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
		streamNodes[((online)? "online" : "offline")][website].appendChild(newLine);
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

function listener(data){
	let website = data.website;
	let id = data.id;
	let contentId = data.contentId;
	let type = data.type;
	let streamData = data.streamData;
	let streamSettings = data.streamSettings;
	let streamUrl = data.streamUrl;
	
	let online = (type == "channel")? streamData.liveStatus.API_Status : streamData.liveStatus.filteredStatus;
	let liveStatus = streamData.liveStatus;
	
	let streamName = streamData.streamName;
	let streamStatus = streamData.streamStatus;
	let streamGame = streamData.streamGame;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamCurrentViewers = streamData.streamCurrentViewers;
	let facebookID = streamData.facebookID;
	let twitterID = streamData.twitterID;
	
	var newLine = document.createElement("div");
	newLine.id = `${website}/${id}/${contentId}`;
	
	if(online){
		stream_right_container_node = document.createElement("span");
		stream_right_container_node.id = "stream_right_container";
		newLine.appendChild(stream_right_container_node);
		
		if(online && typeof streamCurrentViewers == "number"){
			var viewerCountNode = document.createElement("span");
			viewerCountNode.classList.add("streamCurrentViewers");
			
			let viewer_number = (typeof streamCurrentViewers == "number")? streamCurrentViewers : parseInt(streamCurrentViewers);
			viewerCountNode.dataset.streamCurrentViewers = (viewer_number < 1000)? viewer_number : ((Math.round(viewer_number / 100)/10)+ "k");
			
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
			statusLine.textContent = streamStatus + ((typeof streamGame == "string" && streamGame.length > 0)? (" (" + streamGame + ")") : "");
			newLine.appendChild(statusLine);
			
			newLine.dataset.streamStatus = streamStatus;
			newLine.dataset.streamStatusLowercase = streamStatus.toLowerCase();
		}
		
		if(streamGame.length > 0){
			if(typeof data.streamGame == "string"){newLine.dataset.streamGame = streamGame};
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
	
	newLine.dataset.streamSettings = JSON.stringify(streamSettings);
	
	if(typeof facebookID == "string" && facebookID != ""){
		newLine.dataset.facebookId = data.facebookID;
	}
	if(typeof data.twitterID == "string" && twitterID != ""){
		newLine.dataset.twitterId = data.twitterID;
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
	
	if(online){
		self.port.emit("openOnlineLive", {id: id, website: website, streamUrl: streamUrl});
	} else {
		self.port.emit("openTab", streamUrl);
	}
}

let current_version;
function getCurrentVersion(data){
	let current_version_node = document.querySelector("#current_version");
	current_version_node.textContent = current_version = data.current_version;
}

function color(hexColorCode) {
	let getCodes =  /^#([\da-fA-F]{2,2})([\da-fA-F]{2,2})([\da-fA-F]{2,2})$/;
	if(getCodes.test(hexColorCode)){
		let result = getCodes.exec(hexColorCode);
		this.R= parseInt(result[1],16);
		this.G= parseInt(result[2],16);
		this.B= parseInt(result[3],16);
	}
	this.rgbCode = function(){
		return "rgb(" + this.R + ", " + this.G + ", " + this.B + ")";
	}
	/* RGB to HSL function from https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion/9493060#9493060 */
	this.getHSL = function(){
		let r = this.R;let g = this.G;let b = this.B;
		
		r /= 255, g /= 255, b /= 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, l = (max + min) / 2;

		if(max == min){
			h = s = 0; // achromatic
		}else{
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch(max){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		return {"H": h * 360, "S": s * 100 + "%", "L": l * 100 + "%"};
	}
}

let panel_theme;
let background_color;
function theme_update(data){
	panel_theme = data.theme;
	background_color = data.background_color;
	
	let background_color_input = document.querySelector("#background_color");
	let panel_theme_select = document.querySelector("#panel_theme");
	background_color_input.value = background_color;
	panel_theme_select.value = panel_theme;
	
	let panelColorStylesheet;
	let baseColor = new color(data.background_color);
	if(typeof baseColor != "object"){return null;}
	panelColorStylesheet = document.createElement("style");
	panelColorStylesheet.id = "panel-color-stylesheet";
	baseColor_hsl = baseColor.getHSL();
	let baseColor_L = JSON.parse(baseColor_hsl.L.replace("%",""))/100;
	if(data.theme == "dark"){
		var textColor_stylesheet = "@import url(css/panel-text-color-white.css);\n";
		if(baseColor_L > 0.5 || baseColor_L < 0.1){
			values = ["19%","13%","26%","13%"];
		} else {
			values = [(baseColor_L + 0.06) * 100 + "%", baseColor_L * 100 + "%", (baseColor_L + 0.13) * 100 + "%", baseColor_L * 100 + "%"];
		}
	} else if(data.theme == "light"){
		var textColor_stylesheet = "@import url(css/panel-text-color-black.css);\n";
		if(baseColor_L < 0.5 /*|| baseColor_L > 0.9*/){
			values = ["87%","74%","81%","87%"];
		} else {
			values = [baseColor_L * 100 + "%", (baseColor_L - 0.13) * 100 + "%", (baseColor_L - 0.06) * 100 + "%", baseColor_L * 100 + "%"];
		}
	}
panelColorStylesheet.textContent = `
${textColor_stylesheet}
body {background-color: hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[0]});}
header, footer {background-color: hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[1]});}
header button, button, .item-stream {background-color: hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[2]});}
#deleteStreamTooltip {background-color: hsla(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[2]}, 0.95);};
header, .item-stream, footer{box-shadow: 0px 0px 5px 0px hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[3]});}
	`
	panelColorStylesheet.setAttribute("data-theme", panel_theme);
	panelColorStylesheet.setAttribute("data-background_color", background_color);
	//console.log(baseColor.rgbCode());
	//console.log("hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + baseColor_hsl.L + ")");
	
	if(typeof panelColorStylesheet == "object"){
		let currentThemeNode = document.querySelector("#panel-color-stylesheet");
		currentThemeNode.parentNode.removeChild(currentThemeNode);
		
		document.querySelector("head").appendChild(panelColorStylesheet);
	}
}

self.port.on('initList', initList);
self.port.on('updateOnlineCount', listenerOnlineCount);
self.port.on('updateOfflineCount', listenerOfflineCount);
self.port.on('updateData', listener);
self.port.on('settingNodesUpdate', settingNodesUpdate);
self.port.on('panel_theme', theme_update);
self.port.on('current_version', getCurrentVersion);

self.port.on('exportPrefsToFile', exportPrefsToFile);
self.port.on('import_preferences', importPrefsFromFile);
self.port.on('export_preferences', getSyncPreferences);

function translateNode(data){
	let translate_data = JSON.parse(data);
	
	if(typeof translate_data.translated == "string"){
		let node_id = translate_data["translate-node-id"];
		let translation = translate_data.translated;
		
		let node = document.querySelector(`${node_id}`);
		if(node != null){
			node.textContent = translation;
		} else {
			console.warn(`Node to translate (id: ${node_id}) not found`);
		}
	}
}
self.port.on('translate', translateNode);

let scrollbar = {"streamList": null, "settings_container": null};
function load_scrollbar(id){
	let scroll_node;
	if(id == "streamList"){
		scroll_node = document.querySelector('#streamList');
	} else if(id == "settings_container"){
		scroll_node = document.querySelector('#settings_container');
	} else if(id == "streamEditor"){
		scroll_node = document.querySelector('#streamEditor');
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

window.onload = function(){
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
}
