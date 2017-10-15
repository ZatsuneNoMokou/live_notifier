'use strict';

var backgroundPage = browser.extension.getBackgroundPage();
let options = backgroundPage.options;

let _ = browser.i18n.getMessage;

var theme_cache_update = backgroundPage.backgroundTheme.theme_cache_update;

function theme_update(){
	let panelColorStylesheet = theme_cache_update(document.querySelector("#generated-color-stylesheet"));
	
	if(typeof panelColorStylesheet === "object" && panelColorStylesheet !== null){
		console.info("Theme update");
		
		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.parentNode.removeChild(currentThemeNode);
		
		document.querySelector("head").appendChild(panelColorStylesheet);
	}
}
theme_update();


function sendDataToMain(id, data){
	backgroundPage.appGlobal.sendDataToMain("Live_Notifier_Options", id,  data);
}

loadPreferences("section#preferences");

let loadJS = browser.extension.getBackgroundPage().loadJS;
function init(){
	loadTranslations();
}
document.addEventListener('DOMContentLoaded',		init);

if(typeof browser.storage.sync === "object"){
	document.querySelector("#syncContainer").classList.remove("hide");
	
	let restaure_sync_button = document.querySelector("#restaure_sync");
	restaure_sync_button.addEventListener("click", function(event){restaureOptionsFromSync(event);});
	
	let save_sync_button = document.querySelector("#save_sync");
	save_sync_button.addEventListener("click", function(event){saveOptionsInSync(event);});
}


/*const ps = new PerfectScrollbar("#contentContainer", {
	includePadding: true,
	suppressScrollX: true
});
window.onresize = function(){
	ps.update();
};*/