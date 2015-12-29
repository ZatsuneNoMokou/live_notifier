function unloadListeners() {
	var refreshStreamsButton = document.querySelector("#refreshStreams");
	refreshStreamsButton.removeEventListener("click",refreshButtonClick);
	
	self.port.removeListener('initList', initList);
	self.port.removeListener('updateOnlineCount', listenerOnlineCount);
	self.port.removeListener('updateOfflineCount', listenerOfflineCount);
	self.port.removeListener('updateData', listener);
	self.port.removeListener('panel_theme', theme_update);
	self.port.removeListener('unloadListeners', unloadListeners);
}

// Event managing function from https://stackoverflow.com/questions/4386300/javascript-dom-how-to-remove-all-events-of-a-dom-object/4386514#4386514
var _eventHandlers = {}; // somewhere global
function addEvent(node, event, handler, capture) {
	if(!(node in _eventHandlers)) {
		// _eventHandlers stores references to nodes
		_eventHandlers[node] = {};
	}
	if(!(event in _eventHandlers[node])) {
		// each entry contains another entry for each event type
		_eventHandlers[node][event] = [];
	}
	// capture reference
	_eventHandlers[node][event].push([handler, capture]);
	node.addEventListener(event, handler, capture);
 }
function removeNodeEvents(node, event) {
	if(node in _eventHandlers) {
		var handlers = _eventHandlers[node];
		if(event in handlers) {
			var eventHandlers = handlers[event];
			for(var i = eventHandlers.length; i--;) {
				var handler = eventHandlers[i];
				node.removeEventListener(event, handler[0], handler[1]);
			}
		}
	}
}

self.port.on('unloadListeners', unloadListeners);

var refreshStreamsButton = document.querySelector("#refreshStreams");

function refreshButtonClick(){
	self.port.emit("refreshStreams","");
}
refreshStreamsButton.addEventListener("click",refreshButtonClick,false);

function removeAllChildren(node){
	// Taken from https://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
	while (node.hasChildNodes()) {
		removeNodeEvents(node.lastChild, "click");
		node.removeChild(node.lastChild);
	}
}

var nodeListOnline = {"dailymotion": document.querySelector("#dailymotionOnlineList"),
	"hitbox": document.querySelector("#hitboxOnlineList"),
	"twitch": document.querySelector("#twitchOnlineList")};
var nodeListOffline = {"dailymotion": document.querySelector("#dailymotionOfflineList"),
	"hitbox": document.querySelector("#hitboxOfflineList"),
	"twitch": document.querySelector("#twitchOfflineList")};

function initList(showOffline){
	for(i in nodeListOnline){
		removeAllChildren(nodeListOnline[i]);
	}
	for(i in nodeListOnline){
		removeAllChildren(nodeListOffline[i]);
	}
	document.querySelector("#streamListOffline").className = (showOffline)? "" : "hide";
}

function showNonEmptySitesBlocks(){
	for(i in nodeListOnline){
		nodeListOnline[i].className = (nodeListOnline[i].hasChildNodes())? "" : "hide";
	}
	for(i in nodeListOffline){
		nodeListOnline[i].className = (nodeListOnline[i].hasChildNodes())? "" : "hide";
	}
}

var streamOnlineCountNode = document.querySelector("#streamOnlineCountLabel");
var streamOfflineCountNode = document.querySelector("#streamOfflineCountLabel");

function listenerOnlineCount(data){
	removeAllChildren(streamOnlineCountNode);
	streamOnlineCountNode.appendChild(document.createTextNode(data));
}

function listenerOfflineCount(data){
	removeAllChildren(streamOfflineCountNode);
	streamOfflineCountNode.appendChild(document.createTextNode(data));
}

function listener(data){
	var newLine = document.createElement("div");
	newLine.id = data.website + '/' + data.id;
	
	let streamOwnerLogo = data.streamOwnerLogo;
	let streamCategoryLogo = data.streamCategoryLogo;
	let streamLogo = ""
	
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
	titleLine.appendChild(document.createTextNode(data.streamName));
	newLine.appendChild(titleLine);
	
	if(data.online && typeof data.streamCurrentViewers == "number"){
		var viewerCountNode = document.createElement("span");
		viewerCountNode.className = "streamCurrentViewers";
		viewerCountNode.appendChild(document.createTextNode(data.streamCurrentViewers));
		var viewerCountLogoNode = document.createElement("i");
		viewerCountLogoNode.className = "material-icons";
		viewerCountLogoNode.appendChild(document.createTextNode("visibility"));
		viewerCountNode.appendChild(viewerCountLogoNode);
		titleLine.appendChild(viewerCountNode);
	}
	
	if(data.online){
		if(data.streamStatus != ""){
			var statusLine = document.createElement("span");
			statusLine.className = "streamStatus";
			statusLine.appendChild(document.createTextNode(data.streamStatus + ((data.streamGame.length > 0)? (" (" + data.streamGame + ")") : "")));
			newLine.appendChild(statusLine);
		}
		
		newLine.className += " item-stream onlineItem";
		nodeListOnline[data.website].appendChild(newLine);
	} else {
		newLine.className += " item-stream offlineItem";
		nodeListOffline[data.website].appendChild(newLine);
	}
	newLine.className += " cursor";
	addEvent(newLine,"click",function(){self.port.emit("openTab",data.streamUrl);},false);
	showNonEmptySitesBlocks();
}

function theme_update(data){
	let panelColorStylesheet = document.createElement("link");
	panelColorStylesheet.id = "panel-color-stylesheet"
	panelColorStylesheet.rel = "stylesheet";
	panelColorStylesheet.type = "text/css";
	panelColorStylesheet.media = "all";
	
	switch(data){
		case "dark":
			panelColorStylesheet.href = "css/panel-color-dark.css";
			break;
		
		case "light":
			panelColorStylesheet.href = "css/panel-color-light.css";
			break;
	}
	if(typeof panelColorStylesheet.href == "string" && panelColorStylesheet.href != ""){
		let currentThemeNode = document.querySelector("#panel-color-stylesheet");
		currentThemeNode.parentNode.removeChild(currentThemeNode);
		
		document.querySelector("head").appendChild(panelColorStylesheet);
	}
}

self.port.on('initList', initList);
self.port.on('updateOnlineCount', listenerOnlineCount);
self.port.on('updateOfflineCount', listenerOfflineCount);
self.port.on('updateData', listener);
self.port.on('panel_theme', theme_update);