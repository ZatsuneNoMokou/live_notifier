'use strict';

let backgroundPage = chrome.extension.getBackgroundPage();
// var getPreference = backgroundPage.getPreference;

async function applyPanelSize() {
	const appGlobal = backgroundPage.appGlobal,
		body = document.body
	;

	body.classList.toggle("showAdvanced", backgroundPage.getPreference("showAdvanced"));
	body.classList.toggle("showExperimented", backgroundPage.getPreference("showExperimented"));
	body.classList.toggle("hasTouch", appGlobal.hasTouch(window));

	body.style.height = backgroundPage.getPreference("panel_height");

	const panelWidth = backgroundPage.getPreference("panel_width");
	body.style.width = panelWidth;
	document.documentElement.style.setProperty('--opentip-maxwidth', `${((panelWidth/2<300)? (panelWidth/2) : panelWidth)}px`);

	const maxWaitStep = 150;
	let size = null;
	for(let maxWaitTime=0; maxWaitTime <= maxWaitStep * 10; maxWaitTime += maxWaitStep) {
		await appGlobal.setTimeout(maxWaitStep);

		size = appGlobal.getPageSize(window);
		if (size.height > 0 && size.width > 0) {
			break;
		}
	}

	if (size.height > 0 && size.height > backgroundPage.getPreference("panel_height")) {
		body.style.height = "100vh";
	}
	if (size.width > 0 && size.width > backgroundPage.getPreference("panel_width")) {
		body.style.width = "100vw";
	}
}
applyPanelSize().catch(console.error);

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
	let jsFiles = ["lib/dom-delegate.js", "lib/opentip-native_modified.js"];

	if(backgroundPage.zDK.isFirefox===true){
		jsFiles.push("lib/perfect-scrollbar.js");
	}

	if(typeof browser==="undefined"||browser===null){
		jsFiles.push("lib/browser-polyfill.js");
	}

	document.body.classList.toggle("isChrome", backgroundPage.appGlobal.hasTouch(window)===true);
	document.body.classList.toggle("isChrome", backgroundPage.zDK.isFirefox===false);
	document.body.classList.toggle("isFirefox", backgroundPage.zDK.isFirefox===true);

	jsFiles = jsFiles.concat(["options-api.js", "lib/lodash.custom.js",  "panel/PanelStreams.js",  "panel/LazyLoading.js",  "panel/panel.js"]);

	backgroundPage.zDK.loadJS(document, jsFiles);
};
