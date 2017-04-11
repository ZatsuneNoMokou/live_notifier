'use strict';

/*		---- Nodes translation ----		*/
function translateNodes(){
	const _ = chrome.i18n.getMessage;
	for(let node of document.querySelectorAll("[data-translate-id]")){
		if(typeof node.tagName == "string"){
			node.textContent = _(node.dataset.translateId);
			delete node.dataset.translateId;
		}
	}
}
function translateNodes_title(){
	const _ = chrome.i18n.getMessage;
	for(let node of document.querySelectorAll("[data-translate-title]")){
		if(typeof node.tagName == "string"){
			node.dataset.toggle = "tooltip";
			if(typeof node.dataset.placement != "string"){
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
				if(mutation.type == "childList"){
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
	if(typeof string != "string"){
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
	if(typeof string != "string"){
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
			if(string == "true" || string == "on" || string == 1){
				return true;
			} else if(string == "false" || string == "off" || string == 0){
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
	if(typeof string != "string"){
		console.warn("Type error")
		string = "";
	}
	let list = string.split(",");
	for(let i in list){
		if(list[i].length == 0){
			delete list[i];
			// Keep a null item, but this null is not considered in for..in loops
		} else {
			list[i] = decodeString(list[i]);
		}
	}
	return list;
}
function getPreference(prefId){
	let options = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options : optionsData.options,
		defaultSettings = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options_default : optionsData.options_default,
		currentPreferences = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().appGlobal.currentPreferences : appGlobal.currentPreferences;
	if(currentPreferences.hasOwnProperty(prefId)){
		const current_pref = currentPreferences[prefId];
		switch(typeof defaultSettings[prefId]){
			case "string":
				return current_pref;
				break;
			case "number":
				if(isNaN(parseInt(current_pref))){
					console.warn(`${prefId} is not a number (${current_pref})`);
					return defaultSettings[prefId];
				} else if(typeof options[prefId].minValue == "number" && parseInt(current_pref) < options[prefId].minValue){
					return options[prefId].minValue;
				} else if(typeof options[prefId].maxValue == "number" && parseInt(current_pref) > options[prefId].maxValue){
					return options[prefId].maxValue;
				} else {
					return parseInt(current_pref);
				}
				break;
			case "boolean":
				return getBooleanFromVar(current_pref);
				break;
			case "undefined":
				console.warn(`The setting "${prefId}" has no default value`);
				return current_pref;
				break;
			default:
				console.warn(`Unknown default type for the setting ${prefId}: ${typeof defaultSettings[prefId]}`);
				return current_pref;
		}
	} else if(typeof defaultSettings[prefId] != "undefined"){
		console.warn(`Preference ${prefId} not found, using default`);
		savePreference(prefId, defaultSettings[prefId]);
		return defaultSettings[prefId];
	} else {
		//console.warn(`Preference ${prefId} not found, no default`);
	}
}
function getSyncPreferences(){
	let obj = {};
	for(let prefId in options){
		const option = options[prefId];
		if(option.hasOwnProperty("sync") == true && option.sync == false){
			continue;
		} else if(option.type == "control" || option.type == "file"){
			continue;
		} else {
			obj[prefId] = getPreference(prefId);
		}
	}
	return obj;
}
function savePreference(prefId, value){
	let options = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options : optionsData.options,
		defaultSettings = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options_default : optionsData.options_default,
		currentPreferences = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().appGlobal.currentPreferences : appGlobal.currentPreferences;
	if(options.hasOwnProperty(prefId) && options[prefId].type == "integer"){
		if(typeof options[prefId].minValue == "number" && parseInt(value) < options[prefId].minValue){
			value = options[prefId].minValue;
		} else if(typeof options[prefId].maxValue == "number" && parseInt(value) > options[prefId].maxValue){
			value = options[prefId].maxValue;
		}
	}
	if(typeof defaultSettings[prefId] == "boolean" || typeof defaultSettings[prefId] == "number"){
		value = value.toString();
	}
	currentPreferences[prefId] = value;
	chrome.storage.local.set({[prefId] : value}, function() {
		if(typeof chrome.runtime.lastError == "object" && chrome.runtime.lastError != null){
			console.dir(chrome.runtime.lastError);
		}
	});
}

function getValueFromNode(node){
	const tagName = node.tagName.toLowerCase();
	if(tagName == "textarea"){
		if(node.dataset.stringTextarea == "true"){
			return node.value.replace(/\n/g, "");
		} else if(node.dataset.stringList == "true"){
			// Split as list, encode item, then make it back a string
			return node.value.split("\n").map(encodeString).join(",");
		} else {
			return node.value;
		}
	} else if(node.type == "checkbox") {
		return node.checked;
	} else if(tagName == "input" && node.type == "number"){
		return parseInt(node.value);
	} else if(typeof node.value == "string"){
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
	let options = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options : optionsData.options;
	
	let prefId = "";
	let prefValue = "";
	if(typeof event.key == "string"){
		prefId = event.key;
		prefValue = event.newValue;
	} else if(typeof event.target == "object"){
		prefId = event.target.id;
		prefValue = getPreference(prefId);
	}
	let prefNode = document.querySelector(`#preferences #${prefId}`);
	
	let isPanelPage = location.pathname.indexOf("panel.html") != -1;
	
	if(event.type != "input" && !(isPanelPage && typeof options[prefId].showPrefInPanel == "boolean" && options[prefId].showPrefInPanel == false) && typeof options[prefId].type == "string" && !(typeof options[prefId].hidden == "boolean" && options[prefId].hidden)){
		if(prefNode == null){
			console.warn(`${prefId} node is null`);
		} else {
			switch(options[prefId].type){
				case "string":
					if(typeof options[prefId].stringList == "boolean" && options[prefId].stringList == true){
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
			if(prefId == "showAdvanced"){
				if(getPreference("showAdvanced")){
					body.classList.add("showAdvanced");
				} else {
					body.classList.remove("showAdvanced");
				}
			}
			if(prefId == "showExperimented"){
				if(getPreference("showExperimented")){
					body.classList.add("showExperimented");
				} else {
					body.classList.remove("showExperimented");
				}
			}
			if(prefId == "panel_theme" || prefId == "background_color" && typeof theme_update == "function"){
				theme_update();
			}
		}
	}
}

/*		---- Save/Restaure preferences from sync ----		*/

// Saves/Restaure options from/to chrome.storage
function saveOptionsInSync(event){
	let settingsDataToSync = getSyncPreferences();
	
	chrome.storage.sync.set(settingsDataToSync, function() {
		// Update status to let user know options were saved.
		let status = document.getElementById('status');
		if(status != null){
			status.textContent = _("options_saved_sync");
		}
		if(typeof chrome.runtime.lastError == "object" && chrome.runtime.lastError != null){
			console.warn(chrome.runtime.lastError);
		}
		if(status != null){
			setTimeout(function() {
				status.textContent = '';
			}, 2500);
		}
	});
}
function restaureOptionsFromSync(event){
	// Default values
	let mergePreferences = event.shiftKey;
	let appGlobal = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().appGlobal : appGlobal;
	chrome.storage.sync.get(options_default_sync, function(items) {
		if(typeof chrome.runtime.lastError == "object" && chrome.runtime.lastError != null){
			console.warn(chrome.runtime.lastError);
		}
		
		for(let prefId in items){
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
						let toLowerCase = function(str){return str.toLowerCase();}
						let oldPrefArrayLowerCase = oldPref.split(/,\s*/).map(toLowerCase);
						newPrefArray = oldPref.split(/,\s*/);
						items[prefId].split(/,\s*/).forEach((value, index, array) => {
							if(oldPrefArrayLowerCase.indexOf(value.toLowerCase()) == -1){
								newPrefArray.push(value);
							}
						})
						savePreference(prefId, newPrefArray.join(","));
						break;
					default:
						savePreference(prefId, items[prefId]);
				}
			} else {
				savePreference(prefId, items[prefId]);
			}
		}
	});
}

/*		---- Node generation of settings ----		*/
function loadPreferences(selector){
	const container = document.querySelector(selector),
		isPanelPage = location.pathname.indexOf("panel.html") != -1,
		options = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options : optionsData.options,
		body = document.querySelector("body");
	
	for(let id in options){
		const option = options[id];
		if(typeof option.type == "undefined"){
			continue;
		}
		if(option.hasOwnProperty("hidden") == true && typeof option.hidden == "boolean" && option.hidden == true){
			continue;
		}
		if(id == "showAdvanced"){
			if(getPreference("showAdvanced")){
				body.classList.add("showAdvanced");
			} else {
				body.classList.remove("showAdvanced");
			}
		}
		if(id == "showExperimented"){
			if(getPreference("showExperimented")){
				body.classList.add("showExperimented");
			} else {
				body.classList.remove("showExperimented");
			}
		}
		
		if(isPanelPage && ((typeof option.prefLevel == "string" && option.prefLevel == "experimented") || (option.hasOwnProperty("showPrefInPanel") == true && typeof option.showPrefInPanel == "boolean" && option.showPrefInPanel == false))){
			continue;
		}
		
		let groupNode = null;
		if(typeof option.group == "string" && option.group != ""){
			groupNode = getPreferenceGroupNode(container, option.group);
		}
		newPreferenceNode(((groupNode == null)? container : groupNode), id, option);
	}
	
	chrome.storage.onChanged.addListener((changes, area) => {
		if(area == "local"){
			for(let prefId in changes){
				refreshSettings({"key": prefId, oldValue: changes[prefId].oldValue, newValue: changes[prefId].newValue});
			}
		}
	})
}
function getPreferenceGroupNode(parent, groupId){
	let groupNode = document.querySelector(`#${groupId}.pref_group`);
	if(groupNode == null){
		groupNode = document.createElement("div");
		groupNode.id = groupId;
		groupNode.classList.add("pref_group");
		if(groupId == "dailymotion" || groupId == "hitbox" || groupId == "twitch" || groupId == "beam"){
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
	let backgroundPage = chrome.extension.getBackgroundPage();
	
	let node = document.createElement("div");
	node.classList.add("preferenceContainer");
	if(typeof prefObj.prefLevel == "string"){
		node.classList.add(prefObj.prefLevel);
	}
	
	let labelNode = document.createElement("label");
	labelNode.classList.add("preference");
	if(typeof prefObj.description == "string"){
		labelNode.title = prefObj.description;
	}
	labelNode.htmlFor = id;
	if(prefObj.type != "control"){
		labelNode.dataset.translateTitle = `${id}_description`;
	}
	
	let title = document.createElement("span");
	title.id = `${id}_title`;
	title.textContent = prefObj.title
	title.dataset.translateId = `${id}_title`;
	labelNode.appendChild(title);
	
	let prefNode = null;
	switch(prefObj.type){
		case "string":
			if(typeof prefObj.stringTextArea == "boolean" && prefObj.stringTextArea == true){
				prefNode = document.createElement("textarea");
				prefNode.dataset.stringTextarea = true;
				prefNode.value = getPreference(id);
			} else if(typeof prefObj.stringList == "boolean" && prefObj.stringList == true){
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
			if(typeof prefObj.rangeInput == "boolean" && prefObj.rangeInput == true && typeof prefObj.minValue == "number" && typeof prefObj.maxValue == "number"){
				prefNode.type = "range";
				prefNode.step = 1;
				
				var output = document.createElement("output");
			} else {
				prefNode.type = "number";
			}
			if(typeof prefObj.minValue == "number"){
				prefNode.min = prefObj.minValue;
			}
			if(typeof prefObj.maxValue == "number"){
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
				let option = prefObj.options[o];
				
				let optionNode = document.createElement("option");
				optionNode.text = option.label;
				optionNode.value = option.value;
				optionNode.dataset.translateId = `${id}_${option.value}`;
				
				prefNode.add(optionNode);
			}
			prefNode.value = getPreference(id);
			break;
	}
	prefNode.id = id;
	if(prefObj.type != "control"){
		prefNode.classList.add("preferenceInput");
	}
	if(prefObj.type == "control"){
		prefNode.dataset.translateId = `${id}`;
	}
	
	let isPanelPage = location.pathname.indexOf("panel.html") != -1;
	if(id.indexOf("_keys_list") != -1 || (isPanelPage && id.indexOf("_user_id") != -1) || (!isPanelPage && (id == "statusBlacklist" || id == "statusWhitelist" || id == "gameBlacklist" || id == "gameWhitelist"))){
		node.classList.add("flex_input_text");
	}
	prefNode.dataset.settingType = prefObj.type;
	
	node.appendChild(labelNode);
	node.appendChild(prefNode);
	parent.appendChild(node);
	
	if(typeof prefNode.type == "string" && prefNode.type == "range"){
		output.textContent = prefNode.value;
		prefNode.addEventListener("change",function(){
			output.textContent = prefNode.value;
		});
		node.appendChild(output);
	}
	
	switch(prefObj.type){
		case "string":
			prefNode.addEventListener("input", settingNode_onChange);
			break;
		case "integer":
		case "bool":
		case "color":
		case "menulist":
			prefNode.addEventListener("change", settingNode_onChange);
			break;
		case "control":
			if(id == "export_preferences"){
				prefNode.addEventListener("click", exportPrefsToFile);
			} else if(id == "import_preferences"){
				prefNode.addEventListener("click", importPrefsFromFile); //(backgroundPage != null)? backgroundPage.importPrefsFromFile : importPrefsFromFile);
			} else if(id.indexOf("_import") != -1){
				prefNode.addEventListener("click", import_onClick);
			}
			break;
	}
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
	let appGlobal = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().appGlobal : appGlobal;
	
	let preferences = getSyncPreferences();
	
	let exportData = {
		"live_notifier_version": appGlobal["version"],
		"preferences": preferences
	}
	
	let link = document.createElement("a");
	link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData));
	link.download = "live_notifier_preferences.json";
	
	simulateClick(link);
}
function importPrefsFromFile(event){
	let mergePreferences = (typeof event == "object" && typeof event.shiftKey == "boolean")? event.shiftKey : false;
	let backgroundPage = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage() : window;
	let appGlobal = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().appGlobal : appGlobal;
	let options = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options : optionsData.options;
	console.warn("Merge: " + mergePreferences);
	let node = document.createElement("input");
	node.type = "file";
	node.className = "hide";
	node.addEventListener("change", function(){
		node.parentNode.removeChild(node);
		let fileLoader=new FileReader();
		if(node.files.length == 0 || node.files.length > 1){
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
					if(new String(error).indexOf("SyntaxError") != -1){
						console.warn(`An error occurred when trying to parse file (Check the file you have used)`);
					} else {
						console.warn(`An error occurred when trying to parse file (${error})`);
					}
				}
				if(file_JSONData != null){
					if(file_JSONData.hasOwnProperty("live_notifier_version") == true && file_JSONData.hasOwnProperty("preferences") == true && typeof file_JSONData.preferences == "object"){
						for(let prefId in file_JSONData.preferences){
							if(typeof options[prefId].type != "undefined" && options[prefId].type != "control" && options[prefId].type != "file" && typeof file_JSONData.preferences[prefId] == typeof options_default_sync[prefId]){
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
											let toLowerCase = function(str){return str.toLowerCase();}
											let oldPrefArrayLowerCase = oldPref.split(/,\s*/).map(toLowerCase);
											newPrefArray = oldPref.split(/,\s*/);
											file_JSONData.preferences[prefId].split(/,\s*/).forEach((value, index, array) => {
												if(oldPrefArrayLowerCase.indexOf(value.toLowerCase()) == -1){
													newPrefArray.push(value);
												}
											})
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
						if(typeof refreshStreamsFromPanel == "funtion"){
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
