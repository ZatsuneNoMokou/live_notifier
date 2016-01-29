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

function onlineNodes(){
	this.dailymotion = document.querySelector("#dailymotionOnlineList");
	this.hitbox = document.querySelector("#hitboxOnlineList");
	this.twitch = document.querySelector("#twitchOnlineList");
}
function offlineNodes(){
	this.dailymotion = document.querySelector("#dailymotionOfflineList");
	this.hitbox = document.querySelector("#hitboxOfflineList");
	this.twitch = document.querySelector("#twitchOfflineList");
}

function initList(showOffline){
	let steamItems = document.querySelectorAll(".item-stream");
	for(let node of steamItems){
		removeNodeEvents(node, "click");
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

var streamOnlineCountNode = document.querySelector("#streamOnlineCountLabel");
var streamOfflineCountNode = document.querySelector("#streamOfflineCountLabel");

function listenerOnlineCount(data){
	let streamOnlineCountNode = document.querySelector("#streamOnlineCountLabel");
	removeAllChildren(streamOnlineCountNode);
	streamOnlineCountNode.appendChild(document.createTextNode(data));
}

function listenerOfflineCount(data){
	let streamOfflineCountNode = document.querySelector("#streamOfflineCountLabel");
	removeAllChildren(streamOfflineCountNode);
	streamOfflineCountNode.appendChild(document.createTextNode(data));
}

function listener(data){
	let nodeListOnline = new onlineNodes();
	let nodeListOffline = new offlineNodes();
	
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
	scrollbar.resetValues();
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

let scrollbar;
window.onload = function(){
	var element = document.querySelector('#steamList');

	// Apply slim scroll plugin
	scrollbar = new slimScroll(element, {
		'wrapperClass': 'scroll-wrapper unselectable mac',
		'scrollBarContainerClass': 'scrollbarContainer',
		'scrollBarContainerSpecialClass': 'animate',
		'scrollBarClass': 'scrollbar',
		'keepFocus': true
	});
	
	// resize example
	// To make the resizing work, set the height of the container in PERCENTAGE
	window.onresize = function(){
		scrollbar.resetValues();
	}
}
