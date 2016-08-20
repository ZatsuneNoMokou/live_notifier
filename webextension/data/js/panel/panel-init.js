'use strict';

var backgroundPage = chrome.extension.getBackgroundPage();
var getPreference = backgroundPage.getPreference;

var theme_cache_update = backgroundPage.backgroundTheme.theme_cache_update;
var optionColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));

if(typeof optionColorStylesheet == "object" && optionColorStylesheet !== null){
	console.info("Theme update");
	
	let currentThemeNode = document.querySelector("#generated-color-stylesheet");
	currentThemeNode.parentNode.removeChild(currentThemeNode);
	
	document.querySelector("head").appendChild(optionColorStylesheet);
}

let loadJS = chrome.extension.getBackgroundPage().loadJS;
window.onload = function () {
	window.onload = null;
	loadJS(document, "/data/js/", ["perfect-scrollbar.min.js", "options-api.js", "panel/panel.js"]);
}
