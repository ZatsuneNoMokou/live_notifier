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

/*		---- get/save preference ----		*/
function encodeString(string){
	if(typeof string !== "string"){
		console.warn(`encodeString: wrong type (${typeof string})`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%/g,"%25");
		string = string.replace(/\:/g,"%3A");
		string = string.replace(/,/g,"%2C");
	}
	return string;
}
function decodeString(string){
	if(typeof string !== "string"){
		console.warn(`encodeString: wrong type (${typeof string})`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%3A/g,":");
		string = string.replace(/%2C/g,",");
		string = string.replace(/%25/g,"%");
	}
	return string;
}

function getBooleanFromVar(string){
	switch(typeof string){
		case "boolean":
			return string;
			break;
		case "number":
		case "string":
			if(string === "true" || string === "on" || string === 1){
				return true;
			} else if(string === "false" || string === "off" || string === 0){
				return false;
			} else {
				console.warn(`getBooleanFromVar: Unkown boolean (${string})`);
				return string;
			}
			break;
		default:
			console.warn(`getBooleanFromVar: Unknown type to make boolean (${typeof string})`);
	}
}
function getFilterListFromPreference(string){
	if(typeof string !== "string"){
		console.warn("Type error");
		string = "";
	}
	let list = string.split(",");
	for(let i in list){
		if(list.hasOwnProperty(i)){
			if(list[i].length === 0){
				delete list[i];
				// Keep a null item, but this null is not considered in for..in loops
			} else {
				list[i] = decodeString(list[i]);
			}
		}
	}
	return list;
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
function getSyncPreferences(){
	const syncPrefs = chromeSettings.getSyncPreferences();
	if(syncPrefs!==undefined){
		return syncPrefs;
	}
}
function savePreference(prefId, value){
	chromeSettings.set(prefId, value);
}

function getValueFromNode(node){
	const tagName = node.tagName.toLowerCase();
	if(tagName === "textarea"){
		if(node.dataset.stringTextarea === "true"){
			return node.value.replace(/\n/g, "");
		} else if(node.dataset.stringList === "true"){
			// Split as list, encode item, then make it back a string
			return node.value.split("\n").map(encodeString).join(",");
		} else {
			return node.value;
		}
	} else if(node.type === "checkbox") {
		return node.checked;
	} else if(tagName === "input" && node.type === "number"){
		return parseInt(node.value);
	} else if(typeof node.value === "string"){
		return node.value;
	} else {
		console.error("Problem with node trying to get value");
	}
}

function settingNode_onChange(event){
	const node = event.target,
		settingName = node.id;
	if(node.validity.valid){
		const settingValue = getValueFromNode(node);
		
		savePreference(settingName, settingValue);
	}
}
function refreshSettings(event){
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
						prefNode.value = getFilterListFromPreference(getPreference(prefId)).join("\n");
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
					prefNode.checked = getBooleanFromVar(prefValue);
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
	let settingsDataToSync = getSyncPreferences();
	
	browser.storage.sync.set(settingsDataToSync)
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
	let appGlobal = (browser.extension.getBackgroundPage() !== null)? browser.extension.getBackgroundPage().appGlobal : appGlobal;
	browser.storage.sync.get(chromeSettings.getSyncKeys())
		.then(items=>{
			for(let prefId in items){
				if(items.hasOwnProperty(prefId)){
					if(mergePreferences){
						let oldPref = getPreference(prefId);
						let newPrefArray;
						switch(prefId){
							case "stream_keys_list":
								let oldPrefArray = oldPref.split(",");
								newPrefArray = items[prefId].split(/,\s*/);
								newPrefArray = oldPrefArray.concat(newPrefArray);

								savePreference(prefId, newPrefArray.join());
								let streamListSetting = new appGlobal.streamListFromSetting("", true);
								streamListSetting.update();
								break;
							case "statusBlacklist":
							case "statusWhitelist":
							case "gameBlacklist":
							case "gameWhitelist":
								let toLowerCase = (str)=>{return str.toLowerCase()};
								let oldPrefArrayLowerCase = oldPref.split(/,\s*/).map(toLowerCase);
								newPrefArray = oldPref.split(/,\s*/);
								items[prefId].split(/,\s*/).forEach(value=>{
									if(oldPrefArrayLowerCase.indexOf(value.toLowerCase()) === -1){
										newPrefArray.push(value);
									}
								});
								savePreference(prefId, newPrefArray.join(","));
								break;
							default:
								savePreference(prefId, items[prefId]);
						}
					} else {
						savePreference(prefId, items[prefId]);
					}
				}

			}
		})
		.catch(err=>{
			if(err){
				console.warn(err);
			}
		})
	;
}

/*		---- Node generation of settings ----		*/
function loadPreferences(selector){
	const container = document.querySelector(selector),
		isPanelPage = location.pathname.indexOf("panel.html") !== -1,
		body = document.querySelector("body");

	chromeSettings.options.forEach((option, id)=>{
		if(typeof option.type === "undefined"){
			return;
		}
		if(option.hasOwnProperty("hidden") && typeof option.hidden === "boolean" && option.hidden === true){
			return;
		}
		if(id === "showAdvanced"){
			if(getPreference("showAdvanced")){
				body.classList.add("showAdvanced");
			} else {
				body.classList.remove("showAdvanced");
			}
		}
		if(id === "showExperimented"){
			if(getPreference("showExperimented")){
				body.classList.add("showExperimented");
			} else {
				body.classList.remove("showExperimented");
			}
		}

		if(isPanelPage && ((typeof option.prefLevel === "string" && option.prefLevel === "experimented") || (option.hasOwnProperty("showPrefInPanel") && typeof option.showPrefInPanel === "boolean" && option.showPrefInPanel === false))){
			return;
		}

		let groupNode = null;
		if(typeof option.group === "string" && option.group !== ""){
			groupNode = getPreferenceGroupNode(container, option.group);
		}
		newPreferenceNode(((groupNode === null)? container : groupNode), id, option);
	});
	
	browser.storage.onChanged.addListener((changes, area) => {
		if(area === "local"){
			for(let prefId in changes){
				if(changes.hasOwnProperty(prefId)){
					refreshSettings({"key": prefId, oldValue: changes[prefId].oldValue, newValue: changes[prefId].newValue});
				}
			}
		}
	})
}
function getPreferenceGroupNode(parent, groupId){
	let groupNode = document.querySelector(`#${groupId}.pref_group`);
	if(groupNode === null){
		groupNode = document.createElement("div");
		groupNode.id = groupId;
		groupNode.classList.add("pref_group");
		if(groupId === "dailymotion" || groupId === "smashcast" || groupId === "hitbox" || groupId === "twitch" || groupId === "mixer" || groupId === "beam"){
			groupNode.classList.add("website_pref");
		}
		parent.appendChild(groupNode);
	}
	return groupNode;
}
function import_onClick(){
	const getWebsite = /^(\w+)_import$/i,
		website = getWebsite.exec(this.id)[1];
	sendDataToMain("importStreams", website);
}
function newPreferenceNode(parent, id, prefObj){
	let node = document.createElement("div");
	node.classList.add("preferenceContainer");
	if(typeof prefObj.prefLevel === "string"){
		node.classList.add(prefObj.prefLevel);
	}
	
	let labelNode = document.createElement("label");
	labelNode.classList.add("preference");
	if(typeof prefObj.description === "string"){
		labelNode.title = prefObj.description;
	}
	labelNode.htmlFor = id;
	if(prefObj.type !== "control"){
		labelNode.dataset.translateTitle = `${id}_description`;
	}
	
	let title = document.createElement("span");
	title.id = `${id}_title`;
	title.textContent = prefObj.title;
	title.dataset.translateId = `${id}_title`;
	labelNode.appendChild(title);
	
	let prefNode = null,
		output;
	switch(prefObj.type){
		case "string":
			if(typeof prefObj.stringTextArea === "boolean" && prefObj.stringTextArea === true){
				prefNode = document.createElement("textarea");
				prefNode.dataset.stringTextarea = true;
				prefNode.value = getPreference(id);
			} else if(typeof prefObj.stringList === "boolean" && prefObj.stringList === true){
				prefNode = document.createElement("textarea");
				prefNode.dataset.stringList = true;
				prefNode.value = getFilterListFromPreference(getPreference(id)).join("\n");
				
				node.classList.add("stringList");
			} else {
				prefNode = document.createElement("input");
				prefNode.type = "text";
				prefNode.value = getPreference(id);
			}
			break;
		case "integer":
			prefNode = document.createElement("input");
			prefNode.required = true;
			if(typeof prefObj.rangeInput === "boolean" && prefObj.rangeInput === true && typeof prefObj.minValue === "number" && typeof prefObj.maxValue === "number"){
				prefNode.type = "range";
				prefNode.step = 1;
				
				output = document.createElement("output");
			} else {
				prefNode.type = "number";
			}
			if(typeof prefObj.minValue === "number"){
				prefNode.min = prefObj.minValue;
			}
			if(typeof prefObj.maxValue === "number"){
				prefNode.max = prefObj.maxValue;
			}
			prefNode.value = parseInt(getPreference(id));
			break;
		case "bool":
			prefNode = document.createElement("input");
			prefNode.type = "checkbox";
			prefNode.checked = getBooleanFromVar(getPreference(id));
			break;
		case "color":
			prefNode = document.createElement("input");
			prefNode.type = "color";
			prefNode.value = getPreference(id);
			break;
		case "control":
			prefNode = document.createElement("button");
			prefNode.textContent = prefObj.label;
			break;
		case "menulist":
			prefNode = document.createElement("select");
			prefNode.size = 2;
			for(let o in prefObj.options){
				if(prefObj.options.hasOwnProperty(o)){
					let option = prefObj.options[o];

					let optionNode = document.createElement("option");
					optionNode.text = option.label;
					optionNode.value = option.value;
					optionNode.dataset.translateId = `${id}_${option.value}`;

					prefNode.add(optionNode);
				}
			}
			prefNode.value = getPreference(id);
			break;
	}
	prefNode.id = id;
	if(prefObj.type !== "control"){
		prefNode.classList.add("preferenceInput");
	}
	if(prefObj.type === "control"){
		prefNode.dataset.translateId = `${id}`;
	}
	
	let isPanelPage = location.pathname.indexOf("panel.html") !== -1;
	if(id.indexOf("_keys_list") !== -1 || (isPanelPage && id.indexOf("_user_id") !== -1) || (!isPanelPage && (id === "statusBlacklist" || id === "statusWhitelist" || id === "gameBlacklist" || id === "gameWhitelist"))){
		node.classList.add("flex_input_text");
	}
	prefNode.dataset.settingType = prefObj.type;
	
	node.appendChild(labelNode);
	node.appendChild(prefNode);
	parent.appendChild(node);
	
	if(typeof prefNode.type === "string" && prefNode.type === "range"){
		output.textContent = prefNode.value;
		prefNode.addEventListener("change",function(){
			output.textContent = prefNode.value;
		});
		node.appendChild(output);
	}
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
	
	let preferences = getSyncPreferences();
	
	let exportData = {
		"live_notifier_version": appGlobal["version"],
		"preferences": preferences
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
						for(let prefId in file_JSONData.preferences){
							if(file_JSONData.preferences.hasOwnProperty(prefId)){
								if(prefId==="hitbox_user_id"){
									file_JSONData.preferences["smashcast_user_id"] = file_JSONData.preferences["hitbox_user_id"];
									delete file_JSONData.preferences["hitbox_user_id"];
									prefId="smashcast_user_id";
								}
								if(prefId==="beam_user_id"){
									file_JSONData.preferences["mixer_user_id"] = file_JSONData.preferences["beam_user_id"];
									delete file_JSONData.preferences["beam_user_id"];
									prefId="mixer_user_id";
								}
								if(chromeSettings.options.has(prefId) && typeof chromeSettings.options.get(prefId).type !== "undefined" && chromeSettings.options.get(prefId).type !== "control" && chromeSettings.options.get(prefId).type !== "file" && typeof file_JSONData.preferences[prefId] === typeof chromeSettings.defaultSettingsSync.get(prefId)){
									if(mergePreferences){
										let oldPref = getPreference(prefId);
										let newPrefArray;
										switch(prefId){
											case "stream_keys_list":
												let oldPrefArray = oldPref.split(",");
												newPrefArray = file_JSONData.preferences[prefId].split(/,\s*/);
												newPrefArray = oldPrefArray.concat(newPrefArray);

												savePreference(prefId, newPrefArray.join());
												let streamListSetting = new appGlobal.streamListFromSetting("", true);
												streamListSetting.update();
												break;
											case "statusBlacklist":
											case "statusWhitelist":
											case "gameBlacklist":
											case "gameWhitelist":
												let toLowerCase = (str)=>{return str.toLowerCase()};
												let oldPrefArrayLowerCase = oldPref.split(/,\s*/).map(toLowerCase);
												newPrefArray = oldPref.split(/,\s*/);
												file_JSONData.preferences[prefId].split(/,\s*/).forEach(value=>{
													if(oldPrefArrayLowerCase.indexOf(value.toLowerCase()) === -1){
														newPrefArray.push(value);
													}
												});
												savePreference(prefId, newPrefArray.join(","));
												break;
											default:
												savePreference(prefId, file_JSONData.preferences[prefId]);
										}
									} else {
										savePreference(prefId, file_JSONData.preferences[prefId]);
									}
								} else {
									console.warn(`Error trying to import ${prefId}`);
								}
							}
						}
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
