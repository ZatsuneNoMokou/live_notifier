'use strict';

var backgroundPage = chrome.extension.getBackgroundPage();
var getPreference = backgroundPage.getPreference;

const applyPanelSize = ()=>{
	const html = document.querySelector("html"),
		body = document.querySelector("body");
	html.style.height = getPreference("panel_height");
	body.style.width = getPreference("panel_width");
};
applyPanelSize();

var theme_cache_update = backgroundPage.backgroundTheme.theme_cache_update;
var optionColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));

if(typeof optionColorStylesheet === "object" && optionColorStylesheet !== null){
	console.info("Theme update");
	
	let currentThemeNode = document.querySelector("#generated-color-stylesheet");
	currentThemeNode.parentNode.removeChild(currentThemeNode);
	
	document.querySelector("body").dataset.theme = optionColorStylesheet.dataset.theme;

	document.querySelector("head").appendChild(optionColorStylesheet);
}

document.querySelector("#disableNotifications").classList.toggle("off", backgroundPage.appGlobal["notificationGlobalyDisabled"]);
document.querySelector("#disableNotifications").dataset.translateTitle = (backgroundPage.appGlobal["notificationGlobalyDisabled"])? "GloballyDisabledNotifications" : "GloballyDisableNotifications";


window.onload = function () {
	window.onload = null;
	let jsFiles = ["lib/jquery.slim.min.js", "lib/perfect-scrollbar.jquery.min.js", "lib/bootstrap.min.js"];
	if(typeof browser==="undefined"||browser===null){
		jsFiles.push("/lib/browser-polyfill.min.js");
	}
	jsFiles = jsFiles.concat(["options-api.js", "lib/mustache.min.js", "lib/lodash.custom.min.js", "panel/panel.js"]);

	backgroundPage.zDK.loadJS(document, jsFiles);
};
