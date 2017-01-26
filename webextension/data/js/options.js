'use strict';

var backgroundPage = chrome.extension.getBackgroundPage();
let options = backgroundPage.optionsData.options;
let options_default = backgroundPage.optionsData.options_default;
let options_default_sync = backgroundPage.optionsData.options_default_sync;

let _ = chrome.i18n.getMessage;

var theme_cache_update = backgroundPage.backgroundTheme.theme_cache_update;

function theme_update(){
	let panelColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));
	
	if(typeof panelColorStylesheet == "object" && panelColorStylesheet !== null){
		console.info("Theme update");
		
		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.parentNode.removeChild(currentThemeNode);
		
		document.querySelector("head").appendChild(panelColorStylesheet);
	}
}
theme_update();


function sendDataToMain(id, data){
	function responseCallback(response){
		if(typeof response != "undefined"){
			console.group();
			console.info(`Port response of ${id}: `);
			console.dir(response);
			console.groupEnd();
		}
	}
	chrome.runtime.sendMessage({"sender": "Live_Notifier_Options","receiver": "Live_Notifier_Main", "id": id, "data": data}, responseCallback);
}

loadPreferences("section#preferences");

let loadJS = chrome.extension.getBackgroundPage().loadJS;
function init(){
	loadTranslations();
}
document.addEventListener('DOMContentLoaded',		init);

if(typeof chrome.storage.sync == "object"){
	document.querySelector("#syncContainer").classList.remove("hide");
	
	let restaure_sync_button = document.querySelector("#restaure_sync");
	restaure_sync_button.addEventListener("click", function(event){restaureOptionsFromSync(event);});
	
	let save_sync_button = document.querySelector("#save_sync");
	save_sync_button.addEventListener("click", function(event){saveOptionsInSync(event);});
}


/*let contentContainer = document.querySelector("#contentContainer");
$(contentContainer).perfectScrollbar({
	theme: "slimScrollbar",
	includePadding: true,
	suppressScrollX: true
});
window.onresize = function(){
	$(contentContainer).perfectScrollbar('update');
}*/
