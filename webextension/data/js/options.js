'use strict';

var backgroundPage = browser.extension.getBackgroundPage();
let options = backgroundPage.options;

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

function init(){
	loadTranslations();



	if(location.hash==="#news"){
		document.querySelector("section#news").classList.remove("hide");
		document.querySelector(`section#news #news-${browser.i18n.getMessage("language")}`).classList.remove("hide");
	}



	if(backgroundPage.zDK.isFirefox===true){
		const
			contentContainer = document.querySelector("#contentContainer"),
			ps = new PerfectScrollbar(contentContainer, {
				// theme: "slimScrollbar",
				suppressScrollX: true
			})
		;

		const resizeScroll = _.debounce(function(e){
			if((e.target.id==="showAdvanced" || e.target.id==="showExperimented") && e.target.checked===false){
				contentContainer.scrollTop = 0;
			}

			ps.update();
		}, 100, {
			maxWait: 200
		});

		const showAdvanced = document.querySelector("#showAdvanced");
		showAdvanced.addEventListener("change", resizeScroll);

		const showExperimented = document.querySelector("#showExperimented");
		showExperimented.addEventListener("change", resizeScroll);

		window.onresize = resizeScroll;
	}
}
document.addEventListener('DOMContentLoaded',		init);

document.body.classList.toggle("isChrome", backgroundPage.appGlobal.hasTouch(window)===true);
document.body.classList.toggle("isChrome", backgroundPage.zDK.isFirefox===false);
document.body.classList.toggle("isFirefox", backgroundPage.zDK.isFirefox===true);

if(typeof browser.storage.sync === "object"){
	document.querySelector("#syncContainer").classList.remove("hide");
	
	let restaure_sync_button = document.querySelector("#restaure_sync");
	restaure_sync_button.addEventListener("click", function(event){restaureOptionsFromSync(event);});
	
	let save_sync_button = document.querySelector("#save_sync");
	save_sync_button.addEventListener("click", function(event){saveOptionsInSync(event);});
}
