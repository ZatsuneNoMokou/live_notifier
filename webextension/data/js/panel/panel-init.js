'use strict';

let backgroundPage = chrome.extension.getBackgroundPage();
// var getPreference = backgroundPage.getPreference;

const applyPanelSize = async ()=>{
	const appGlobal = backgroundPage.appGlobal,
		body = document.body
	;

	body.style.height = backgroundPage.getPreference("panel_height");

	const panelWidth = backgroundPage.getPreference("panel_width");
	body.style.width = panelWidth;
	document.documentElement.style.setProperty('--opentip-maxwidth', `${((panelWidth/2<300)? (panelWidth/2) : panelWidth)}px`);

	let size = null;
	for(let maxWaitTime=0;maxWaitTime<=1000;maxWaitTime+=100){
		if(maxWaitTime>0){
			await appGlobal.setTimeout(100);
		}
		size = appGlobal.getPageSize(window);
		if(size.height>0 && size.width>0){
			break;
		}
	}

	if(size.height > 0 && size.height > backgroundPage.getPreference("panel_height")){
		body.style.height = "100vh";
	}
	if(size.width > 0 && size.width > backgroundPage.getPreference("panel_width")){
		body.style.width = "100vw";
	}
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
	let jsFiles = ["lib/dom-delegate.js", "lib/perfect-scrollbar.js", "lib/opentip-native_modified.js"];
	if(typeof browser==="undefined"||browser===null){
		backgroundPage.zDK.isFirefox = false;
		jsFiles.push("/lib/browser-polyfill.js");
	}
	jsFiles = jsFiles.concat(["options-api.js", "lib/lodash.custom.js",  "panel/panel.js"]);

	backgroundPage.zDK.loadJS(document, jsFiles);
};
