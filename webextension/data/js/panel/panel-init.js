'use strict';

let backgroundPage = chrome.extension.getBackgroundPage();
// var getPreference = backgroundPage.getPreference;

const applyPanelSize = ()=>{
	const html = document.querySelector("html"),
		body = document.querySelector("body");
	html.style.height = backgroundPage.getPreference("panel_height");

	const panelWidth = backgroundPage.getPreference("panel_width");
	body.style.width = panelWidth;
	document.documentElement.style.setProperty('--opentip-maxwidth', `${((panelWidth/2<300)? (panelWidth/2) : panelWidth)}px`);
};
applyPanelSize();

var optionColorStylesheet = backgroundPage.backgroundTheme.theme_cache_update(document.querySelector("#generated-color-stylesheet"));

if(typeof optionColorStylesheet === "object" && optionColorStylesheet !== null){
	console.info("Theme update");
	
	let currentThemeNode = document.querySelector("#generated-color-stylesheet");
	currentThemeNode.parentNode.removeChild(currentThemeNode);
	
	document.querySelector("body").dataset.theme = optionColorStylesheet.dataset.theme;

	document.querySelector("head").appendChild(optionColorStylesheet);
}

document.querySelector("#disableNotifications").classList.toggle("off", backgroundPage.appGlobal["notificationGlobalyDisabled"]);
document.querySelector("#disableNotifications").dataset.translateTitle = (backgroundPage.appGlobal["notificationGlobalyDisabled"])? "GloballyDisabledNotifications" : "GloballyDisableNotifications";


window.onload = async function () {
	window.onload = null;
	let jsFiles = ["lib/dom-delegate.min.js", "lib/perfect-scrollbar.min.js", "lib/opentip-native_modified.js"];
	if(typeof browser==="undefined"||browser===null){
		backgroundPage.zDK.isFirefox = false;
		jsFiles.push("/lib/browser-polyfill.min.js");
	}
	jsFiles = jsFiles.concat(["options-api.js", "lib/lodash.custom.min.js",  "panel/panel.js"]);

	backgroundPage.zDK.loadJS(document, jsFiles);
};
