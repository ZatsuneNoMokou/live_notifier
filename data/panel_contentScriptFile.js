function unloadListeners() {
	var refreshStreamsButton = document.querySelector("#refreshStreams");
	refreshStreamsButton.removeEventListener("click",refreshButtonClick);
	
	self.port.removeListener('initList', initList);
	self.port.removeListener('updateOnlineCount', listenerOnlineCount);
	self.port.removeListener('updateOfflineCount', listenerOfflineCount);
	self.port.removeListener('updateData', listener);
	self.port.removeListener('unloadListeners', unloadListeners);
}

self.port.on('unloadListeners', unloadListeners);

var refreshStreamsButton = document.querySelector("#refreshStreams");
function refreshButtonClick(){
	self.port.emit("refreshStreams","");
}
refreshStreamsButton.addEventListener("click",refreshButtonClick,false);

function newLink(text,link){
	var node = document.createElement("a");
	node.appendChild(document.createTextNode(text));
	node.href = link;
	node.target = "_blank";
	return node;
}

function removeAllChildren(node){
	// Taken from https://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
	while (node.hasChildNodes()) {
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
	var titleLine = document.createElement("span");
	titleLine.className = "streamTitle";
	var link = newLink(data.streamName,data.streamUrl);
	titleLine.appendChild(link);
	
	newLine.appendChild(titleLine);
	if(data.online){
		if(data.streamStatus != ""){
			var statusLine = document.createElement("span");
			statusLine.className = "streamStatus";
			statusLine.appendChild(document.createTextNode(data.streamStatus));
			newLine.appendChild(statusLine);
		}
		
		newLine.className = "item-stream onlineItem";
		nodeListOnline[data.website].appendChild(newLine);
	} else {
		newLine.className = "item-stream offlineItem";
		nodeListOffline[data.website].appendChild(newLine);
	}
	showNonEmptySitesBlocks();
}

self.port.on('initList', initList);
self.port.on('updateOnlineCount', listenerOnlineCount);
self.port.on('updateOfflineCount', listenerOfflineCount);
self.port.on('updateData', listener);
