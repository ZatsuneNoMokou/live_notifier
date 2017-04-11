'use strict';

var backgroundPage = chrome.extension.getBackgroundPage();
var getPreference = backgroundPage.getPreference;

var theme_cache_update = backgroundPage.backgroundTheme.theme_cache_update;
var optionColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));

if(typeof optionColorStylesheet == "object" && optionColorStylesheet !== null){
	console.info("Theme update");
	
	let currentThemeNode = document.querySelector("#generated-color-stylesheet");
	currentThemeNode.parentNode.removeChild(currentThemeNode);
	
	document.querySelector("body").dataset.theme = optionColorStylesheet.dataset.theme;

	document.querySelector("head").appendChild(optionColorStylesheet);
}

document.querySelector("#disableNotifications").classList.toggle("off", backgroundPage.appGlobal["notificationGlobalyDisabled"]);
document.querySelector("#disableNotifications").dataset.translateTitle = (backgroundPage.appGlobal["notificationGlobalyDisabled"])? "GloballyDisabledNotifications" : "GloballyDisableNotifications";

let loadJS = chrome.extension.getBackgroundPage().loadJS;
window.onload = function () {
	window.onload = null;
	loadJS(document, "/data/js/", ["lib/jquery-3.2.1.min.js", "lib/perfect-scrollbar.jquery.min.js", "lib/bootstrap.min.js", "options-api.js", "lib/mustache.min.js", "panel/panel.js"]);
}
