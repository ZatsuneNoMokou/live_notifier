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

function getValueFromNode(node){
	if(node.type == "checkbox") {
		return node.checked;
	} else if(node.tagName == "input" && node.type == "number"){
		console.log("Number");
		return parseInt(node.value);
	} else if(typeof node.value == "string"){
		return node.value;
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
		}, 2500);
	}
}
deleteStreamButton.addEventListener("click",deleteStreamButtonClick,false);

/*				---- Settings ----				*/
let settings_button = document.querySelector("#settings");
let setting_Enabled = false;
let scrollbar_settings_container = null;
function setting_Toggle(){
	let streamList = document.querySelector("#streamList");
	let settings_node = document.querySelector("#settings_container");
	if(setting_Enabled){
		setting_Enabled = false;
		streamList.className = streamList.className.replace(/\s*hide/i,"");
		settings_node.className += " hide";
		if(scrollbar_streamList !== null){
			scrollbar_streamList.resetValues();
		}
	} else {
		setting_Enabled = true;
		streamList.className += " hide";
		settings_node.className = settings_node.className.replace(/\s*hide/i,"");
		
		if(scrollbar_settings_container === null){
			settings_container_node = document.querySelector('#settings_container');
			
			// Apply slim scroll plugin
			scrollbar_settings_container = new slimScroll(settings_container_node, {
				'wrapperClass': 'scroll-wrapper unselectable mac',
				'scrollBarContainerClass': 'scrollbarContainer',
				'scrollBarContainerSpecialClass': 'animate',
				'scrollBarClass': 'scrollbar',
				'keepFocus': true
			});
		}
		
		initSettings();
		
		if(scrollbar_settings_container !== null){
			scrollbar_settings_container.resetValues();
		}
	}

}
settings_button.addEventListener("click", setting_Toggle, false);

function initSettings(){
	let hitbox_user_id_input = document.querySelector("#hitbox_user_id");
	hitbox_user_id_input.addEventListener("blur", settingNode_onChange, false);
	
	let hitbox_import_button = document.querySelector("button#hitbox_import");
	hitbox_import_button.addEventListener("click", function(){
		self.port.emit("importStreams","hitbox");
	});
	
	let twitch_user_id_input = document.querySelector("#twitch_user_id");
	twitch_user_id_input.addEventListener("blur", settingNode_onChange, false);
	
	let twitch_import_button = document.querySelector("button#twitch_import");
	twitch_import_button.addEventListener("click", function(){
		self.port.emit("importStreams","twitch");
	});
	
	let dailymotion_check_delay_input = document.querySelector("#dailymotion_check_delay");
	dailymotion_check_delay_input.addEventListener("change", settingNode_onChange, false);
	
	let notify_online_input = document.querySelector("#notify_online");
	notify_online_input.addEventListener("change", settingNode_onChange, false);
	
	let notify_offline_input = document.querySelector("#notify_offline");
	notify_offline_input.addEventListener("change", settingNode_onChange, false);
	
	let show_offline_in_panel = document.querySelector("#show_offline_in_panel");
	show_offline_in_panel.addEventListener("change", settingNode_onChange, false);
	
	let confirm_addStreamFromPanel_input = document.querySelector("#confirm_addStreamFromPanel");
	confirm_addStreamFromPanel_input.addEventListener("change", settingNode_onChange, false);
	
	let confirm_deleteStreamFromPanel_input = document.querySelector("#confirm_deleteStreamFromPanel");
	confirm_deleteStreamFromPanel_input.addEventListener("change", settingNode_onChange, false);
	
	let background_color_input = document.querySelector("#background_color");
	background_color_input.addEventListener("change", settingNode_onChange, false);
	
	let panel_theme_select = document.querySelector("#panel_theme");
	panel_theme_select.addEventListener("change", settingNode_onChange, false);
	
	let livestreamer_cmd_to_clipboard_input = document.querySelector("#livestreamer_cmd_to_clipboard");
	livestreamer_cmd_to_clipboard_input.addEventListener("change", settingNode_onChange, false);
	
	let livestreamer_cmd_quality_input = document.querySelector("#livestreamer_cmd_quality");
	livestreamer_cmd_quality_input.addEventListener("blur", settingNode_onChange, false);
	
	self.port.emit("refreshPanel","");
}

function settingNode_onChange(){
	let node = this;
	let setting_Name = this.id;
	let value = getValueFromNode(node);
	if(setting_Name == "dailymotion_check_delay" && value < 1){
		value = 1;
	}
	self.port.emit("setting_Update", {settingName: setting_Name, settingValue: value});
	self.port.emit("refreshPanel", {});
}

function settingNodesUpdate(data){
	let settingNode = document.querySelector(`#${data.settingName}`);
	if(settingNode !== null){
		switch(settingNode.getAttribute("data-setting-type")){
			case "boolean":
				settingNode.checked = data.settingValue;
				break;
			case "number":
				settingNode.value = parseInt(data.settingValue);
				break;
			case "string":
				settingNode.value = data.settingValue;
				break;
		}
	}
}
/*			---- Settings end ----			*/

function removeAllChildren(node){
	// Taken from https://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
	while (node.hasChildNodes()) {
		node.lastChild.removeEventListener("click", streamItemClick);
		node.removeChild(node.lastChild);
	}
}

function onlineNodes(){
	this.dailymotion = document.querySelector("#dailymotionOnlineList");
	this.hitbox = document.querySelector("#hitboxOnlineList");
	this.twitch = document.querySelector("#twitchOnlineList");
	this.beam = document.querySelector("#beamOnlineList");
}
function offlineNodes(){
	this.dailymotion = document.querySelector("#dailymotionOfflineList");
	this.hitbox = document.querySelector("#hitboxOfflineList");
	this.twitch = document.querySelector("#twitchOfflineList");
	this.beam = document.querySelector("#beamOfflineList");
}

function initList(showOffline){
	let streamItems = document.querySelectorAll(".item-stream");
	for(let node of streamItems){
		node.removeEventListener("click", streamItemClick);
		node.parentNode.removeChild(node);
	}
	document.querySelector("#streamListOffline").className = (showOffline)? "" : "hide";
}

function showNonEmptySitesBlocks(){
	let nodeListOnline = new onlineNodes();
	let nodeListOffline = new offlineNodes();

	for(i in nodeListOnline){
		nodeListOnline[i].className = (nodeListOnline[i].hasChildNodes())? "" : "hide";
	}
	for(i in nodeListOffline){
		nodeListOnline[i].className = (nodeListOnline[i].hasChildNodes())? "" : "hide";
	}
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
	node.setAttribute("data-id", id);
	node.setAttribute("data-website", website);
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "delete";
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

function listener(data){
	let nodeListOnline = new onlineNodes();
	let nodeListOffline = new offlineNodes();
	
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
			statusLine.textContent = data.streamStatus + ((data.streamGame.length > 0)? (" (" + data.streamGame + ")") : "");
			newLine.appendChild(statusLine);
		}
		
		newLine.className += " item-stream onlineItem";
		nodeListOnline[data.website].appendChild(newLine);
	} else {
		newLine.className += " item-stream offlineItem";
		nodeListOffline[data.website].appendChild(newLine);
	}
	newLine.className += " cursor";
	
	newLine.setAttribute("data-streamId", data.id);
	newLine.setAttribute("data-contentId", data.contentId);
	newLine.setAttribute("data-online", data.online);
	newLine.setAttribute("data-streamWebsite", data.website);
	newLine.setAttribute("data-streamUrl", data.streamUrl);
	newLine.addEventListener("click", streamItemClick);
	
	/*			---- Control span ----			*/
	let control_span = document.createElement("span");
	control_span.className = "stream_control";
	let deleteButton_node = newDeleteStreamButton(data.id, data.website);
	control_span.appendChild(deleteButton_node);
	
	let copyLivestreamerCmd_node = null;
	if(data.type == "live"){
		copyLivestreamerCmd_node = newCopyLivestreamerCmdButton(data.id, data.contentId, data.website);
		control_span.appendChild(copyLivestreamerCmd_node);
	}
	if(data.online){
		stream_right_container_node.appendChild(control_span);
	} else {
		newLine.appendChild(control_span);
	}
	deleteButton_node.addEventListener("click", newDeleteStreamButton_onClick, false);
	if(copyLivestreamerCmd_node !== null){
		copyLivestreamerCmd_node.addEventListener("click", newCopyLivestreamerCmdButton_onClick, false);
	}
	
	newLine.draggable = true;
	
	showNonEmptySitesBlocks();
	if(scrollbar_streamList !== null){
		scrollbar_streamList.resetValues();
	}
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
	custom_stylesheet += "#deleteStreamTooltip {background-color: hsla(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[2] + ", 0.95);}\n";
	custom_stylesheet += "header, .item-stream, footer{box-shadow: 0px 0px 5px 0px hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[3] + ");}";
	panelColorStylesheet.textContent = custom_stylesheet;
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


// slimScroll from https://github.com/kamlekar/slim-scroll (License MIT)
var slimScroll = function(C, payload){
	var i = {},
		w = "wrapper",s = "scrollBar",S = "scrollBarContainer",a = "",m = "",l="data-slimscroll",
		// properties
		oT = "offsetTop",sT = "scrollTop",pE = "parentElement",pes= "previousElementSibling", 
		iH = "innerHTML",cT = "currentTarget",sK = "scroll-k",U = "%",d = ".",
		// IE8 properties 
		// (Dev note: remove below variables from all over the code to exclude IE8 compatibility)
		pN = "parentNode",pS = "previousSibling",sE = "srcElement",
		assignValues = function(k){
			var q = i.E;
			i.h = i[S].offsetHeight;
			i.sH = i[w].scrollHeight;
			i.sP = (i.h/i.sH) * 100;
			// i.sbh is scroll bar height in pixels without pixel unit.
			i.sbh = i.sP * i.h/100;
			// Manually set the height of the scrollbar (in percentage)
			// if user hasn't provided the fixed scroll height value
			if(!q.sH) i.sP1 = i.sbh < q.mH? (q.mH/i.h * 100): i.sP;
			else i.sP1 = q.sH/i.h * 100;
			
			i.rP1 = 100 - i.sP1;
			i.x = (i.sH - i.h) * ((i.sP1 - i.sP)/(100 - i.sP));
			i.sH1 = Math.abs((i.x / (i.rP1)) + (i.sH/100));
			i[s].style.height = i.sP1 + U;
			
			i.reposition = getReposition(i[s], i.h);
		},
		// Start of private functions
		setAttr = function(e, p, v){
			e.setAttribute(p,v);
		},
		getAttr = function(e, p){
			if(!e) return;
			return e.getAttribute(p);            
		},
		addClass = function(e, c){
			if(c.length) e.className = c;
		},
		cE = function(c, h, p){
			var d = document.createElement('div');
			addClass(d, c);
			d[iH] = h;
			p.appendChild(d);
			return d;
		},
		setScroll = function(e){
			var e = e || event,el = e.target || event[sE],
				p = el[pE] || el[pN];
			var q = i.E;

			if(!i || p === i[S]) return;
			var eY = e.pageY || event.clientY,
				top = ((eY - getTop(i[w][pE] || i[w][pN]))/i.h * 100) - i.sP1/2;
			if(top > i.rP1) top = i.rP1;
			else if(top < 0) top = 0;
			i[s].style.top = top + U;
			i[w][sT] = top * i.sH1;
			addClass(i[S], q.S + q.a);
		},
		beginScroll = function(e){
			// removing selected text
			// Link: http://stackoverflow.com/a/3171348
			var sel = window.getSelection ? window.getSelection() : document.selection;
			if (sel) {
				if (sel.removeAllRanges) sel.removeAllRanges();
				else if (sel.empty) sel.empty();
			}
			var e = e || event,
				el = e[cT] || e[sE];

			addEvent('mousemove', document, moveScroll);
			addEvent('mouseup', document, endScroll);

			i[oT] = getTop(i[w]);
			i.firstY = e.pageY || event.clientY;
			if(!i.reposition) i.reposition = getReposition(i[s], i.h);
			// Disable text selection while dragging the scrollbar
			return false;
		},
		getReposition = function(i, h){
			var x = parseInt(i.style.top.replace(U,""),10) * h/100;
			return x?x:0;
		},
		moveScroll = function(e){
			var e = e || event,
				q = i.E,
				eY = e.pageY || e.clientY,
				top = (i.reposition + eY - i.firstY)/i.h * 100;

			if(i.rP1 < top) top = i.rP1;
			if(!i.previousTop) i.previousTop = top + 1;
			var blnThreshold = top >= 0 && i.firstY > i[oT];
			if((i.previousTop > top && blnThreshold) || (blnThreshold && (i[w][sT] + i.h !== i.sH))){
				i[s].style.top = top + U;
				i.previousTop = top;   
				i[w][sT] = top * i.sH1;
			}
			addClass(i[S], q.S);
		},
		endScroll = function(e){
			var e = e || event,q = i.E; 

			removeEvent('mousemove', document);
			removeEvent('mouseup', document);

			i.reposition = 0;
			addClass(i[S], q.S + q.a);
		},
		doScroll = function(e){
			var e = e || event;
			if(!i) return;
			var q = i.E;
			addClass(i[S], q.S);
			i[s].style.top = i[w][sT]/i.sH1 + U;
			addClass(i[S], q.S + q.a);
		},
		addEvent = function(e, el, func){
			el['on' + e] = func;
			// el.addEventListener(e, func, false);
		},
		removeEvent = function(e, el){
			el['on' + e] = null;
			// el.removeEventListener(e, func, false);
		},
		addCSSRule = function(S, s, r, i) {
			if(S.insertRule) S.insertRule(s + "{" + r + "}", i);
			else if(S.addRule) S.addRule(s, r, i);
		},
		getTop = function(el){
			var t = document.documentElement[sT];
			return el.getBoundingClientRect().top + (t?t:document.body[sT]);
		},
		insertCss = function(){
			if(window.slimScroll.inserted){
				return;
			}
			// Inserting css rules
			// Link: http://davidwalsh.name/add-rules-stylesheets
			var slim = "["+l+"]",
				imp = " !important",
				pA = "position:absolute"+imp,
				// classes
				w = pA+";overflow:auto"+imp+";left:0px;top:0px"+imp+";right:-18px;bottom:0px"+imp+";padding-right:8px"+imp+";",
				S = pA+";top:0px"+imp+";bottom:0px"+imp+";right:0px;left:auto;width:5px;cursor:pointer"+imp+";padding-right:0px"+imp+";",
				s = pA+";background-color:#999;top:0px;left:0px;right:0px;",
				//creating a sheet
				style = document.createElement('style'),
				scrollBar = "[data-scrollbar]";
			try{
				// WebKit hack :(
				style.appendChild(document.createTextNode(""));
			}catch(ex){}
			
			var head =  document.head || document.getElementsByTagName('head')[0];
				
			// adding above css to the sheet
			head.insertBefore(style, (head.hasChildNodes())
								? head.childNodes[0]
								: null);
			var sheet = style.sheet;
			if(sheet){                
				addCSSRule(sheet, slim+">div", w, 0);
				addCSSRule(sheet, slim+">div+div", S, 0);
				addCSSRule(sheet, scrollBar, s, 0);
			}
			else{
				style.styleSheet.cssText = slim+">div{"+w+"}"+slim+">div+div"+"{"+S+"}"+slim+">div+div>div{"+s+"}";
			}
			window.slimScroll.inserted = true;
		},
		// Initial function
		init = function(){
			C.removeAttribute(l);  //reset
			if(C.offsetHeight < C.scrollHeight){
				setAttr(C, l, '1');
				insertCss();
				var h = C[iH], q = i.E = {};
				// setting user defined classes
				payload = payload || {};
				q.w = payload.wrapperClass || "";
				q.s = payload.scrollBarClass || "";
				q.S = payload.scrollBarContainerClass || "";
				q.a = payload.scrollBarContainerSpecialClass ? " " + payload.scrollBarContainerSpecialClass : "";
				q.mH = payload.scrollBarMinHeight || 25;
				q.sH = payload.scrollBarFixedHeight;  // could be undefined

				C[iH] = "";
				i[w] = cE(q.w, h, C);
				i[S] = cE(q.S + q.a, "", C);
				i[s] = cE(q.s, "", i[S]);
				setAttr(i[s], 'data-scrollbar', '1');
				assignValues();

				if(payload.keepFocus){
					setAttr(i[w], 'tabindex', '-1');
					i[w].focus();
				}
				// Attaching mouse events
				addEvent('mousedown', i[s], beginScroll);
				addEvent('click', i[S], setScroll);
				// For scroll
				addEvent('scroll', i[w], doScroll);
				// addEvent('selectstart', i[S], function(){return;});
			}
		}();
	return {
		resetValues: assignValues
	}
};

let scrollbar_streamList = null;
window.onload = function(){
	let streamList_node = document.querySelector('#streamList');

	// Apply slim scroll plugin
	scrollbar_streamList = new slimScroll(streamList_node, {
		'wrapperClass': 'scroll-wrapper unselectable mac',
		'scrollBarContainerClass': 'scrollbarContainer',
		'scrollBarContainerSpecialClass': 'animate',
		'scrollBarClass': 'scrollbar',
		'keepFocus': true
	});
	
	// resize example
	// To make the resizing work, set the height of the container in PERCENTAGE
	window.onresize = function(){
		if(scrollbar_streamList !== null){
			scrollbar_streamList.resetValues();
		}
		
		if(scrollbar_settings_container !== null){
			scrollbar_settings_container.resetValues();
		}
	}
}
