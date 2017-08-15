'use strict';

/*		---- Nodes translation ----		*/
function translateNodes(){
	const _ = browser.i18n.getMessage;
	for(let node of document.querySelectorAll("[data-translate-id]")){
		if(typeof node.tagName === "string"){
			node.textContent = _(node.dataset.translateId);
			delete node.dataset.translateId;
		}
	}
}
function translateNodes_title(){
	const _ = browser.i18n.getMessage;
	for(let node of document.querySelectorAll("[data-translate-title]")){
		if(typeof node.tagName === "string"){
			node.dataset.toggle = "tooltip";
			if(typeof node.dataset.placement !== "string"){
				node.dataset.placement = "auto";
			}
			node.title = _(node.dataset.translateTitle);
			$(node).tooltip({
				"trigger": "hover"
			});
			delete node.dataset.translateTitle;
		}
	}
}

function loadTranslations(){
	let body = document.querySelector('body'),
		observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				if(mutation.type === "childList"){
					translateNodes(document);
					translateNodes_title(document);
				}
			});
		});
	
	// configuration of the observer:
	const config = {
		attributes: false,
		childList: true,
		subtree: true
	};
	
	translateNodes();
	translateNodes_title();
	
	// pass in the target node, as well as the observer options
	observer.observe(body, config);
	
	// later, you can stop observing
	//observer.disconnect();
}

let chromeSettings;
if(browser.extension.getBackgroundPage() !== null){
	const backgroundPage = browser.extension.getBackgroundPage();
	if(backgroundPage.hasOwnProperty("chromeSettings")){
		chromeSettings = backgroundPage.chromeSettings;
	} else {
		chromeSettings = backgroundPage.chromeSettings = new ChromePreferences(options);
	}
}

function getPreference(prefId){
	const pref = chromeSettings.get(prefId);
	if(pref!==undefined){
		return pref;
	}
}
function savePreference(prefId, value){
	chromeSettings.set(prefId, value);
}

function settingNode_onChange(event){
	const backgroundPage = browser.extension.getBackgroundPage(),
		node = event.target,
		settingName = node.id;

	if(node.validity.valid){
		savePreference(settingName, backgroundPage.getValueFromNode(node));
	}
}
function refreshSettings(event){
	const backgroundPage = browser.extension.getBackgroundPage();

	let prefId = "";
	let prefValue = "";
	if(typeof event.key === "string"){
		prefId = event.key;
		prefValue = event.newValue;
	} else if(typeof event.target === "object"){
		prefId = event.target.id;
		prefValue = getPreference(prefId);
	}
	let prefNode = document.querySelector(`#preferences #${prefId}`);
	
	let isPanelPage = location.pathname.indexOf("panel.html") !== -1;
	
	if(event.type !== "input" && !(isPanelPage && typeof chromeSettings.options.get(prefId).showPrefInPanel === "boolean" && chromeSettings.options.get(prefId).showPrefInPanel === false) && typeof chromeSettings.options.get(prefId).type === "string" && !(typeof chromeSettings.options.get(prefId).hidden === "boolean" && chromeSettings.options.get(prefId).hidden)){
		if(prefNode === null){
			console.warn(`${prefId} node is null`);
		} else {
			switch(chromeSettings.options.get(prefId).type){
				case "string":
					if(typeof chromeSettings.options.get(prefId).stringList === "boolean" && chromeSettings.options.get(prefId).stringList === true){
						prefNode.value = backgroundPage.getFilterListFromPreference(getPreference(prefId)).join("\n");
					} else {
						prefNode.value = prefValue;
					}
					break;
				case "color":
				case "menulist":
					prefNode.value = prefValue;
					break;
				case "integer":
					prefNode.value = parseInt(prefValue);
					break;
				case "bool":
					prefNode.checked = backgroundPage.getBooleanFromVar(prefValue);
					break;
				case "control":
					// Nothing to update, no value
					break;
			}
			let body = document.querySelector("body");
			if(prefId === "showAdvanced"){
				if(getPreference("showAdvanced")){
					body.classList.add("showAdvanced");
				} else {
					body.classList.remove("showAdvanced");
				}
			}
			if(prefId === "showExperimented"){
				if(getPreference("showExperimented")){
					body.classList.add("showExperimented");
				} else {
					body.classList.remove("showExperimented");
				}
			}
			if(prefId === "panel_theme" || prefId === "background_color" && typeof theme_update === "function"){
				theme_update();
			}
		}
	}
}

/*		---- Save/Restaure preferences from sync ----		*/

// Saves/Restaure options from/to browser.storage
function saveOptionsInSync(event){
	chromeSettings.saveInSync()
		.then(()=>{
			// Update status to let user know options were saved.
			let status = document.getElementById('status');
			if(status !== null){
				status.textContent = _("options_saved_sync");

				setTimeout(function() {
					status.textContent = '';
				}, 2500);
			}
		})
		.catch(err=>{
			if(err){
				console.warn(err);
			}
		})
	;
}
function restaureOptionsFromSync(event){
	// Default values
	let mergePreferences = event.shiftKey;
	chromeSettings.restaureFromSync((typeof mergePreferences==="boolean")? mergePreferences : false);
}

/*		---- Node generation of settings ----		*/
function loadPreferences(selector){
	chromeSettings.loadPreferencesNodes(document.querySelector(selector));
	
	browser.storage.onChanged.addListener((changes, area) => {
		if(area === "local"){
			for(let prefId in changes){
				if(changes.hasOwnProperty(prefId)){
					refreshSettings({"key": prefId, oldValue: changes[prefId].oldValue, newValue: changes[prefId].newValue});
				}
			}
		}
	});
}
function import_onClick(){
	const getWebsite = /^(\w+)_import$/i,
		website = getWebsite.exec(this.id)[1];
	sendDataToMain("importStreams", website);
}
if(typeof $ !== "undefined"){
	$(document).on("input", "[data-setting-type='string']", settingNode_onChange);
	$(document).on("change", "[data-setting-type='integer'],[data-setting-type='bool'],[data-setting-type='color'],[data-setting-type='menulist']", settingNode_onChange);
	$(document).on("click", "#export_preferences", exportPrefsToFile);
	$(document).on("click", "#import_preferences", importPrefsFromFile);
	$(document).on("click", "[id$='_import']", import_onClick); // [id$='_import'] => Every id that end with _import
}

/*		---- Import/Export preferences from file ----		*/
function simulateClick(node) {
	let evt = new MouseEvent("click", {
		bubbles: true,
		cancelable: true,
		view: window,
	});
	// Return true is the event haven't been canceled
	return node.dispatchEvent(evt);
}
function exportPrefsToFile(event){
	let appGlobal = (browser.extension.getBackgroundPage() !== null)? browser.extension.getBackgroundPage().appGlobal : appGlobal;

	let exportData = {
		"live_notifier_version": appGlobal["version"],
		"preferences": chromeSettings.getSyncPreferences()
	};

	let link = document.createElement("a");
	link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData));
	link.download = "live_notifier_preferences.json";

	simulateClick(link);
}
function importPrefsFromFile(event){
	let mergePreferences = (typeof event === "object" && typeof event.shiftKey === "boolean")? event.shiftKey : false;
	let appGlobal = (browser.extension.getBackgroundPage() !== null)? browser.extension.getBackgroundPage().appGlobal : appGlobal;

	console.warn("Merge: " + mergePreferences);
	let node = document.createElement("input");
	node.type = "file";
	node.className = "hide";
	node.addEventListener("change", function(){
		node.parentNode.removeChild(node);
		let fileLoader=new FileReader();
		if(node.files.length === 0 || node.files.length > 1){
			console.warn(`[Input error] ${node.files.length} file(s) selected `);
		} else {
			fileLoader.readAsText(node.files[0]);
			fileLoader.onloadend = function(event){
				let rawFileData = event.target.result;
				let file_JSONData = null;
				try{
					file_JSONData = JSON.parse(rawFileData);
				}
				catch(error){
					if(error.message && error.message.indexOf("SyntaxError") !== -1){
						console.warn(`An error occurred when trying to parse file (Check the file you have used)`);
					} else {
						console.warn(`An error occurred when trying to parse file (${error})`);
					}
				}
				if(file_JSONData !== null){
					if(file_JSONData.hasOwnProperty("live_notifier_version") && file_JSONData.hasOwnProperty("preferences") && typeof file_JSONData.preferences === "object"){
						chromeSettings.importFromJSON(file_JSONData.preferences, (typeof mergePreferences==="boolean")? mergePreferences : false);

						if(typeof refreshStreamsFromPanel === "function"){
							refreshStreamsFromPanel();
						} else {
							sendDataToMain("refreshStreams","");
						}
					}
				}
			}
		}
	});
	document.querySelector("head").appendChild(node);
	simulateClick(node);
}
