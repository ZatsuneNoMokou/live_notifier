function unloadListeners() {
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
}

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
		if(node.getAttribute("data-string-textarea") == "true"){
			return node.value.replace(/\n/g, "");
		} else if(node.getAttribute("data-string-list") == "true"){
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


self.port.on('unloadListeners', unloadListeners);

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
	if(node.draggable = true && node.getAttribute("data-streamId") !== null){
		let id = node.getAttribute("data-streamId");
		let website = node.getAttribute("data-streamWebsite");
		
		let data = {id: id, website: website};
		
		event.dataTransfer.setData("text", JSON.stringify(data));
	}
}
function drop(event) {
	event.preventDefault();
	
	let dropDiv = document.querySelector("#deleteStream");
	dropDiv.className = dropDiv.className.replace(/\s*active/i,"");
	
	let data = JSON.parse(event.dataTransfer.getData("text"));
	
	self.port.emit("deleteStream", {id: data.id, website: data.website});
}
function dragenter(event){
	if(event.target.className.indexOf('dragover') != -1){
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.className += " active";
	}
}
function dragleave(event){
	let node = event.target;
	if(event.target.className.indexOf('dragover') != -1){
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.className = dropDiv.className.replace(/\s*active/i,"");
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
		deleteStreamTooltip.className = deleteStreamTooltip.className.replace(/\s*hide/i,"");
		setTimeout(function() {
			showDeleteTooltip = false;
			deleteStreamTooltip.className += " hide";
		}, 1250);
	}
	
	let streamListNode = document.querySelector("#streamList");
	let deleteButtonMode_reg = /\s*deleteButtonMode/;
	if(deleteButtonMode_reg.test(streamListNode.className)){
		streamListNode.className = streamListNode.className.replace(deleteButtonMode_reg,"");
	} else {
		streamListNode.className += " deleteButtonMode";
	}
}
deleteStreamButton.addEventListener("click",deleteStreamButtonClick,false);

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
	
	if(hiddenClass.test(searchInputContainer.className)){
		searchInputContainer.className = searchInputContainer.className.replace(/\s*hide/i,"");
	} else {
		searchInputContainer.className += " hide";
		searchInput.value = "";
		searchInput_onInput();
	}
	scrollbar_streamList_update();
}
toggle_search_button.addEventListener("click", searchContainer_Toggle);

function searchInput_onInput(){
	let searchInput = document.querySelector("input#searchInput");
	let somethingElseThanSpaces = /[^\s]+/;
	let search = searchInput.value.toLowerCase();
	let searchCSS_Node = document.querySelector("#search-cssSelector");
	if(search.length > 0 && somethingElseThanSpaces.test(search)){
		searchCSS_Node.textContent =  `
.item-stream:not([data-streamnamelowercase*="${search}"]):not([data-streamstatuslowercase*="${search}"]):not([data-streamgamelowercase*="${search}"]):not([data-streamwebsitelowercase*="${search}"]){
	display: none;
	visibility: hidden;
}
`;
	} else {
		searchCSS_Node.textContent = "";
		searchInput.value = "";
		searchInput_onInput();
	}
	scrollbar_streamList_update();
}

/*				---- Settings ----				*/
let settings_button = document.querySelector("#settings");
let setting_Enabled = false;
function unhideClassNode(node){
	let hideClass_reg = /\s*hide/i;
	
	if(hideClass_reg.test(node.className) == true){
		node.className = node.className.replace(/\s*hide/i,"");
	}
}
function hideClassNode(node){
	let hideClass_reg = /\s*hide/i;
	
	if(hideClass_reg.test(node.className) == false){
		node.className += " hide";
	}
}
function setting_Toggle(){
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	
	hideClassNode(streamEditor);
	
	if(setting_Enabled){
		setting_Enabled = false;
		
		self.port.emit("refreshPanel","");
		
		unhideClassNode(streamList);
		hideClassNode(settings_node);
		
		settings_node.className += " hide";
		
		scrollbar_streamList_update();
	} else {
		setting_Enabled = true;
		unhideClassNode(settings_node);
		hideClassNode(streamList);
		
		settings_node.className = settings_node.className.replace(/\s*hide/i,"");
		
		scrollbar_settings_container_update();
	}
}
settings_button.addEventListener("click", setting_Toggle, false);


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
		groupNode.className = "pref_group";
		if(groupId == "dailymotion" || groupId == "hitbox" || groupId == "twitch" || groupId == "beam"){
			groupNode.className += " website_pref"
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
	node.className = "preferenceContainer";
	
	let labelNode = document.createElement("label");
	labelNode.className = "preference";
	if(typeof prefObj.description == "string"){
		labelNode.title = prefObj.description;
	}
	labelNode.htmlFor = id;
	labelNode.setAttribute("data-translate-title",`${id}_description`)
	
	let title = document.createElement("span");
	title.id = `${id}_title`;
	title.textContent = prefObj.title
	title.setAttribute("data-l10n-id",`${id}_title`)
	labelNode.appendChild(title);
	
	self.port.emit("translate", JSON.stringify({"translate-node-id": `#${id}_title`, "data-l10n-id": `${id}_title`}));
	
	let prefNode = null;
	switch(prefObj.type){
		case "string":
			if(typeof prefObj.stringList == "boolean" && prefObj.stringList == true){
				prefNode = document.createElement("textarea");
				prefNode.setAttribute("data-string-list", "true");
				//prefNode.value = getFilterListFromPreference(getPreferences(id)).join("\n");
				
				node.className += " stringList";
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
				optionNode.setAttribute("data-l10n-id",`${id}_options.${option.label}`);
				
				self.port.emit("translate", JSON.stringify({"translate-node-id": `#${id} #${option.value}`, "data-l10n-id": `${id}_options.${option.label}`}));
				
				prefNode.add(optionNode);
			}
			//prefNode.value = getPreferences(id);
			break;
	}
	prefNode.id = id;
	if(prefObj.type != "control"){
		prefNode.className = "preferenceInput";
	}
	if(prefObj.type == "control"){
		self.port.emit("translate", JSON.stringify({"translate-node-id": `#${id}`, "data-l10n-id": `${id}_label`}));
	}
	if(id.indexOf("_keys_list") != -1 || id.indexOf("_user_id") != -1 || id == "statusBlacklist" || id == "statusWhitelist" || id == "gameBlacklist" || id == "gameWhitelist"){
		node.className += " flex_input_text";
	}
	prefNode.setAttribute("data-setting-type", prefObj.type);
	
	if(prefObj.type != "menulist"){
		prefNode.setAttribute("data-l10n-id", id);
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
			if(id.indexOf("_import") != -1){
				prefNode.addEventListener("click", import_onClick, false);
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
	
	let website = node.getAttribute("data-website");
	let id = node.getAttribute("data-id");
	let contentId = node.getAttribute("data-contentId");
	
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
	document.querySelector("#streamListOffline").className = (showOffline)? "" : "hide";
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
	let id = node.getAttribute("data-id");
	let website = node.getAttribute("data-website");
	
	self.port.emit("deleteStream", {id: id, website: website});
}
function newDeleteStreamButton(id, website){
	let node = document.createElement("span");
	node.className = "deleteStreamButton";
	node.setAttribute("data-id", id);
	node.setAttribute("data-website", website);
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "delete";
	node.appendChild(node_img);
	
	return node;
}
function newShareStreamButton_onClick(event){
	event.stopPropagation();
	let node = this;
	
	self.port.emit("shareStream", {
		website: node.getAttribute("data-website"),
		id: node.getAttribute("data-id"),
		contentId: node.getAttribute("data-contentId"),
	});
}
function newShareStreamButton(id, contentId, website, streamName, streamUrl, streamStatus, facebookID, twitterID){
	let node = document.createElement("span");
	node.setAttribute("data-website", website);
	node.setAttribute("data-id", id);
	node.setAttribute("data-contentId", contentId);
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "share";
	node.appendChild(node_img);
	
	return node;
}
function newEditStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.getAttribute("data-id");
	let contentId = node.getAttribute("data-contentId");
	let website = node.getAttribute("data-website");
	let title = node.getAttribute("data-title");
	
	let streamSettings = JSON.parse(node.getAttribute("data-streamSettings"));
	
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	
	hideClassNode(streamList);
	hideClassNode(settings_node);
	
	let titleNode = document.querySelector("#editedStreamTitle");
	titleNode.textContent = title;
	
	let saveEditedStream = document.querySelector("#saveEditedStream");
	saveEditedStream.setAttribute("data-id", id);
	saveEditedStream.setAttribute("data-contentId", contentId);
	saveEditedStream.setAttribute("data-website", website);
	
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
	scrollbar_streamEditor_update();
}
function newEditStreamButton(id, contentId, website, title, streamSettings){
	let node = document.createElement("span");
	node.setAttribute("data-id", id);
	node.setAttribute("data-contentId", contentId);
	node.setAttribute("data-website", website);
	node.setAttribute("data-title", title);
	node.setAttribute("data-streamSettings", JSON.stringify(streamSettings));
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "settings";
	node.appendChild(node_img);
	
	return node;
}
function newCopyLivestreamerCmdButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.getAttribute("data-id");
	let contentId = node.getAttribute("data-contentId");
	let website = node.getAttribute("data-website");
	
	self.port.emit("copyLivestreamerCmd", {id: id, contentId: contentId, website: website});
}
function newCopyLivestreamerCmdButton(id, contentId, website){
	let node = document.createElement("span");
	node.setAttribute("data-id", id);
	node.setAttribute("data-contentId", contentId);
	node.setAttribute("data-website", website);
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "content_copy";
	node.appendChild(node_img);
	
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
			current_node.className = current_node.className.replace(/\s*hide/i,"");
			current_node.className = current_node.className + ((current_node.hasChildNodes())? "" : " hide");
		}
	}
}
function insertStreamNode(newLine, data){
	let statusNode;
	let statusStreamList;
	
	if(data.online){
		statusNode = document.querySelector("#streamListOnline");
		statusStreamList = document.querySelectorAll("#streamListOnline .item-stream");
	} else {
		statusNode = document.querySelector("#streamListOffline");
		statusStreamList = document.querySelectorAll("#streamListOffline .item-stream");
	}
	
	if(group_streams_by_websites){
		streamNodes[((data.online)? "online" : "offline")][data.website].appendChild(newLine);
		return true;
	} else {
		if(statusStreamList.length > 0){
			for(let i in statusStreamList){
				let streamNode = statusStreamList[i];
				if(typeof streamNode.getAttribute == "function"){
					let streamNode_title = streamNode.getAttribute("data-streamName");
					if(data.streamName.toLowerCase() < streamNode_title.toLowerCase()){
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
	var newLine = document.createElement("div");
	newLine.id = `${data.website}/${data.id}/${data.contentId}`;
	
	let stream_right_container_node;
	if(data.online && typeof data.streamCurrentViewers == "number"){
		stream_right_container_node = document.createElement("span");
		stream_right_container_node.id = "stream_right_container";
		
		var viewerCountNode = document.createElement("span");
		viewerCountNode.className = "streamCurrentViewers";
		
		let viewer_number = (typeof data.streamCurrentViewers == "number")? data.streamCurrentViewers : parseInt(data.streamCurrentViewers);
		viewerCountNode.textContent = (viewer_number < 1000)? viewer_number : ((Math.round(viewer_number / 100)/10)+ "k");
		
		var viewerCountLogoNode = document.createElement("i");
		viewerCountLogoNode.className = "material-icons";
		viewerCountLogoNode.textContent ="visibility";
		viewerCountNode.appendChild(viewerCountLogoNode);
		stream_right_container_node.appendChild(viewerCountNode);
		newLine.appendChild(stream_right_container_node);
	}
	
	let streamOwnerLogo = data.streamOwnerLogo;
	let streamCategoryLogo = data.streamCategoryLogo;
	let streamLogo = "";
	
	if(data.online && typeof streamCategoryLogo == "string" && streamCategoryLogo != ""){
		streamLogo  = streamCategoryLogo;
	} else if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	if(typeof streamLogo == "string" && streamLogo != ""){
		newLine.style.backgroundImage = "url('" + streamLogo + "')";
		newLine.className = "streamLogo";
	}

	var titleLine = document.createElement("span");
	titleLine.className = "streamTitle";
	if(typeof streamLogo == "string" && streamLogo != ""){
		var imgStreamStatusLogo = document.createElement("img");
		imgStreamStatusLogo.className = "streamStatusLogo";
		imgStreamStatusLogo.src = (data.online)? "online-stream.svg" : "offline-stream.svg";
		titleLine.appendChild(imgStreamStatusLogo);
	}
	titleLine.textContent = data.streamName;
	newLine.appendChild(titleLine);
	
	if(data.online){
		if(data.streamStatus != ""){
			var statusLine = document.createElement("span");
			statusLine.className = "streamStatus";
			statusLine.textContent = data.streamStatus + ((typeof data.streamGame == "string" && data.streamGame.length > 0)? (" (" + data.streamGame + ")") : "");
			newLine.appendChild(statusLine);
			
			newLine.setAttribute("data-streamStatus", data.streamStatus);
			newLine.setAttribute("data-streamStatusLowerCase", data.streamStatus.toLowerCase());
		}
		
		if(data.streamGame.length > 0){
			if(typeof data.streamGame == "string"){newLine.setAttribute("data-streamGame", data.streamGame)};
			newLine.setAttribute("data-streamGameLowerCase", data.streamGame.toLowerCase());
		}
		
		newLine.className += " item-stream onlineItem";
		insertStreamNode(newLine, data);
	} else {
		newLine.className += " item-stream offlineItem";
		insertStreamNode(newLine, data);
	}
	newLine.className += " cursor";
	
	newLine.setAttribute("data-streamId", data.id);
	newLine.setAttribute("data-contentId", data.contentId);
	newLine.setAttribute("data-online", data.online);
	newLine.setAttribute("data-streamName", data.streamName);
	newLine.setAttribute("data-streamNameLowerCase", data.streamName.toLowerCase());
	newLine.setAttribute("data-streamWebsite", data.website);
	newLine.setAttribute("data-streamWebsiteLowerCase", data.website.toLowerCase());
	newLine.setAttribute("data-streamUrl", data.streamUrl);
	if(typeof data.facebookID == "string" && data.facebookID != ""){
		newLine.setAttribute("data-facebookID", data.facebookID);
	}
	if(typeof data.facebookID == "string" && data.twitterID != ""){
		newLine.setAttribute("data-twitterID", data.twitterID);
	}
	newLine.addEventListener("click", streamItemClick);
	
	/*			---- Control span ----			*/
	let control_span = document.createElement("span");
	control_span.className = "stream_control";
	let deleteButton_node = newDeleteStreamButton(data.id, data.website);
	control_span.appendChild(deleteButton_node);
	
	let copyLivestreamerCmd_node = null;
	let editStream_node = null;
	let shareStream_node = null;
	if(data.type == "live"){
		copyLivestreamerCmd_node = newCopyLivestreamerCmdButton(data.id, data.contentId, data.website);
		control_span.appendChild(copyLivestreamerCmd_node);
	}
	editStream_node = newEditStreamButton(data.id, data.contentId, data.website, data.streamName, data.streamSettings);
	control_span.appendChild(editStream_node);
	if(data.online){
		shareStream_node = newShareStreamButton(data.id, data.contentId, data.website, data.streamName, data.streamUrl, data.streamStatus, (typeof data.facebookID == "string")? data.facebookID: "", (typeof data.twitterID == "string")? data.twitterID: "");
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
	scrollbar_streamList_update();
}
function streamItemClick(){
	let node = this;
	let id = node.getAttribute("data-streamId");
	let online = node.getAttribute("data-online");
	let website = node.getAttribute("data-streamWebsite");
	let streamUrl = node.getAttribute("data-streamUrl");
	
	if(online){
		self.port.emit("openOnlineLive", {id: id, website: website, streamUrl: streamUrl});
	} else {
		self.port.emit("openTab", streamUrl);
	}
}

function current_version(data){
	let current_version_node = document.querySelector("#current_version");
	current_version_node.textContent = data.current_version;
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
self.port.on('current_version', current_version);

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
function scrollbar_streamList_update(){
	let scroll_node = document.querySelector('#streamList');
	Ps.update(scroll_node);
}
function scrollbar_streamEditor_update(){
	let scroll_node = document.querySelector('#streamEditor');
	Ps.update(scroll_node);
}
function scrollbar_settings_container_update(){
	let scroll_node = document.querySelector('#settings_container');
	Ps.update(scroll_node);
}

window.onload = function(){
	load_scrollbar("streamList");
	load_scrollbar("streamEditor");
	load_scrollbar("settings_container");
	
	window.onresize = function(){
		scrollbar_streamList_update();
		scrollbar_streamEditor_update();
		scrollbar_settings_container_update();
	}
}
