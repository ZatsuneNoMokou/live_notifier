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

var addStreamButton = document.querySelector("#addStream");

function addStreamButtonClick(){
	self.port.emit("addStream","");
}
addStreamButton.addEventListener("click",addStreamButtonClick,false);

let deleteStreamButton = document.querySelector("#deleteStream");
let deleteStreamWarning = document.querySelector("#deleteStreamWarning");
let deleteModeState = false;

function deleteStreamButtonClick(){
	if(deleteModeState){
		deleteModeState = false;
		deleteStreamButton.className = deleteStreamButton.className.replace(/\s*active/i,"");
		deleteStreamWarning.className += " hide";
	} else {
		deleteModeState = true;
		deleteStreamButton.className += " active";
		deleteStreamWarning.className = deleteStreamWarning.className.replace(/\s*hide/i,"");
	}
}
deleteStreamButton.addEventListener("click",deleteStreamButtonClick,false);

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
	addEvent(newLine,"click",function(){streamItemClick(data);},false);
	showNonEmptySitesBlocks();
}
function streamItemClick(data){
	if(deleteModeState == true){
		self.port.emit("deleteStream", data);
		deleteStreamButtonClick();
	} else {
		if(data.online){
			self.port.emit("openOnlineLive", data);
		} else {
			self.port.emit("openTab", data.streamUrl);
		}
	}
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

function theme_update(data){
	let panelColorStylesheet;
	let baseColor = new color(data.background_color);
	if(typeof baseColor != "object"){return null;}
	panelColorStylesheet = document.createElement("style");
	panelColorStylesheet.id = "panel-color-stylesheet";
	baseColor_hsl = baseColor.getHSL();
	let baseColor_L = JSON.parse(baseColor_hsl.L.replace("%",""))/100;
	if(data.theme == "dark"){
		var custom_stylesheet = "@import url(css/panel-text-color-white.css);\n";
		if(baseColor_L > 0.5 || baseColor_L < 0.1){
			values = ["19%","13%","26%","13%"];
		} else {
			values = [(baseColor_L + 0.06) * 100 + "%", baseColor_L * 100 + "%", (baseColor_L + 0.13) * 100 + "%", baseColor_L * 100 + "%"];
		}
	} else if(data.theme == "light"){
		var custom_stylesheet = "@import url(css/panel-text-color-black.css);\n";
		if(baseColor_L < 0.5 /*|| baseColor_L > 0.9*/){
			values = ["87%","74%","81%","87%"];
		} else {
			values = [baseColor_L * 100 + "%", (baseColor_L - 0.13) * 100 + "%", (baseColor_L - 0.06) * 100 + "%", baseColor_L * 100 + "%"];
		}
	}
	custom_stylesheet += "body {background-color: hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[0] + ");}\n";
	custom_stylesheet += "header, footer {background-color: hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[1] + ");}\n";
	custom_stylesheet += "header button, .item-stream {background-color: hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[2] + ");}\n";
	custom_stylesheet += "header, .item-stream, footer{box-shadow: 0px 0px 5px 0px hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[3] + ");}";
	panelColorStylesheet.appendChild(document.createTextNode(custom_stylesheet));
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
self.port.on('panel_theme', theme_update);
