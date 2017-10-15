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

class ChromePreferences extends Map{
	constructor(options){
		super(new Map());

		if(options===undefined){
			throw "Missing argument"
		}

		let mapOptions = new Map();
		for(let i in options){
			if(options.hasOwnProperty(i)){
				mapOptions.set(i, options[i]);
			}
		}
		Object.defineProperty(this, "options", {
			value: mapOptions,
			writable: false
		});

		let defaultSettings = new Map();
		let defaultSettingsSync = new Map();
		for(let id in options){
			if(options.hasOwnProperty(id)){
				let option = options[id];
				if(typeof option.value !== "undefined"){
					defaultSettings.set(id, option.value);

					if(!(typeof option.sync === "boolean" && option.sync === false)){
						defaultSettingsSync.set(id, option.value);
					}
				}
			}
		}
		Object.defineProperty(this, "defaultSettings", {
			value: defaultSettings,
			writable: false
		});
		Object.defineProperty(this, "defaultSettingsSync", {
			value: defaultSettingsSync,
			writable: false
		});

		let loadPromise = async ()=>{
			let currentLocalStorage = null, err = "";
			try{
				currentLocalStorage = await browser.storage.local.get(null)
			} catch(err){
				Object.defineProperty(this, "loadingState", {
					value: "failed",
					configurable: true,
					writable: false
				});
			}

			if(this.loadingState==="failed"){
				throw err;
			} else {
				if(currentLocalStorage!==null){
					for(let prefId in currentLocalStorage){
						if(currentLocalStorage.hasOwnProperty(prefId)){ // Make sure to not loop constructors
							if(this.defaultSettings.has(prefId)){
								this.originalSet(prefId, currentLocalStorage[prefId]);
							} else {
								this.originalSet(prefId, currentLocalStorage[prefId]);
								console.warn(`${prefId} has no default value (value: ${currentLocalStorage[prefId]})`);
							}
						}
					}

					// Load default settings for the missing settings without saving them in the storage
					this.defaultSettings.forEach((pref, prefId)=>{
						if(!this.has(prefId)){
							this.originalSet(prefId, pref);
						}
					});
				}

				Object.defineProperty(this, "loadingState", {
					value: "success",
					configurable: true,
					writable: false
				});
				return true;
			}
		};
		Object.defineProperty(this, "loadingState", {
			value: "loading",
			configurable: true,
			writable: false
		});
		Object.defineProperty(this, "loadingPromise", {
			writable: false,
			value: loadPromise()
		});
	}

	getRealValue(prefId){
		if(this.has(prefId)){
			const current_pref = this.originalGet(prefId);
			switch(typeof this.defaultSettings.get(prefId)){
				case "string":
					return current_pref;
					break;
				case "number":
					if(isNaN(parseInt(current_pref))){
						console.warn(`${prefId} is not a number (${current_pref})`);
						return this.defaultSettings.get(prefId);
					} else if(typeof this.options.get(prefId).minValue === "number" && parseInt(current_pref) < this.options.get(prefId).minValue){
						return this.options.get(prefId).minValue;
					} else if(typeof this.options.get(prefId).maxValue === "number" && parseInt(current_pref) > this.options.get(prefId).maxValue){
						return this.options.get(prefId).maxValue;
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
					console.warn(`Unknown default type for the setting ${prefId}: ${typeof this.defaultSettings.get(prefId)}`);
					return current_pref;
			}
		} else if(typeof this.defaultSettings.get(prefId) !== "undefined"){
			console.warn(`Preference ${prefId} not found, using default`);
			this.set(prefId, this.defaultSettings.get(prefId));
			return this.defaultSettings.get(prefId);
		} else {
			//console.warn(`Preference ${prefId} not found, no default`);
		}
	}
	getSyncPreferences(){
		let obj = {};
		this.options.forEach((option, prefId)=>{
			if(option.hasOwnProperty("sync") === true && option.sync === false){
				//continue;
			} else if(option.type === "control" || option.type === "file"){
				//continue;
			} else {
				obj[prefId] = this.get(prefId);
			}
		});
		return obj;
	}
	getSyncKeys(){
		let keysArray = [];
		this.defaultSettingsSync.forEach((value, key)=>{
			keysArray.push(key);
		});
		return keysArray;
	}
	importFromJSON(preferences, mergePreferences=false){
		for(let prefId in preferences){
			if(preferences.hasOwnProperty(prefId)){
				if(prefId==="hitbox_user_id"){
					preferences["smashcast_user_id"] = preferences["hitbox_user_id"];
					delete preferences["hitbox_user_id"];
					prefId="smashcast_user_id";
				}
				if(prefId==="beam_user_id"){
					preferences["mixer_user_id"] = preferences["beam_user_id"];
					delete preferences["beam_user_id"];
					prefId="mixer_user_id";
				}
				if(this.options.has(prefId) && typeof this.options.get(prefId).type !== "undefined" && this.options.get(prefId).type !== "control" && this.options.get(prefId).type !== "file" && typeof preferences[prefId] === typeof this.defaultSettingsSync.get(prefId)){
					if(mergePreferences){
						let oldPref = this.get(prefId);
						let newPrefArray;
						switch(prefId){
							case "stream_keys_list":
								let oldPrefArray = oldPref.split(",");
								newPrefArray = preferences[prefId].split(/,\s*/);
								newPrefArray = oldPrefArray.concat(newPrefArray);

								this.set(prefId, newPrefArray.join());
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
								preferences[prefId].split(/,\s*/).forEach(value=>{
									if(oldPrefArrayLowerCase.indexOf(value.toLowerCase()) === -1){
										newPrefArray.push(value);
									}
								});
								this.set(prefId, newPrefArray.join(","));
								break;
							default:
								this.set(prefId, preferences[prefId]);
						}
					} else {
						this.set(prefId, preferences[prefId]);
					}
				} else {
					console.warn(`Error trying to import ${prefId}`);
				}
			}
		}
	}
	saveInSync(){
		return browser.storage.sync.set(this.getSyncPreferences());
	}
	async restaureFromSync(mergePreferences=false){
		const appGlobal = (browser.extension.getBackgroundPage() !== null)? browser.extension.getBackgroundPage().appGlobal : appGlobal,
			items = await browser.storage.sync.get(this.getSyncKeys());

		for(let prefId in items){
			if(items.hasOwnProperty(prefId)){
				if(mergePreferences){
					let oldPref = this.get(prefId);
					let newPrefArray;
					switch(prefId){
						case "stream_keys_list":
							let oldPrefArray = oldPref.split(",");
							newPrefArray = items[prefId].split(/,\s*/);
							newPrefArray = oldPrefArray.concat(newPrefArray);

							this.set(prefId, newPrefArray.join());
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
							this.set(prefId, newPrefArray.join(","));
							break;
						default:
							this.set(prefId, items[prefId]);
					}
				} else {
					this.set(prefId, items[prefId]);
				}
			}
		}
		return "success";
	}


	loadPreferencesNodes(container){
		const doc = container.ownerDocument,
			isPanelPage = container.baseURI.indexOf("panel.html") !== -1,
			body = doc.querySelector("body");
		this.options.forEach((option, id)=>{
			if(typeof option.type === "undefined"){
				return;
			}
			if(option.hasOwnProperty("hidden") && option.hidden === true){
				return;
			}
			if(id === "showAdvanced"){
				if(this.get("showAdvanced")){
					body.classList.add("showAdvanced");
				} else {
					body.classList.remove("showAdvanced");
				}
			}
			if(id === "showExperimented"){
				if(this.get("showExperimented")){
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
				const groupId = option.group;
				groupNode = doc.querySelector(`#${groupId}.pref_group`);

				if(groupNode === null){
					groupNode = doc.createElement("div");
					groupNode.id = groupId;
					groupNode.classList.add("pref_group");
					if(groupId === "dailymotion" || groupId === "smashcast" || groupId === "hitbox" || groupId === "twitch" || groupId === "mixer" || groupId === "beam"){
						groupNode.classList.add("website_pref");
					}
					container.appendChild(groupNode);
				}
			}

			if(groupNode===null){
				groupNode = container;
			}

			groupNode.appendChild(this.newPreferenceNode(groupNode, id));
		});
	}
	newPreferenceNode(parent, id){
		const prefObj = this.options.get(id);

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
			beforeInputLabel = null,
			afterInputLabel = null,
			output;
		switch(prefObj.type){
			case "string":
				if(typeof prefObj.stringTextArea === "boolean" && prefObj.stringTextArea === true){
					prefNode = document.createElement("textarea");
					prefNode.dataset.stringTextarea = true;
					prefNode.value = this.get(id);
				} else if(typeof prefObj.stringList === "boolean" && prefObj.stringList === true){
					prefNode = document.createElement("textarea");
					prefNode.dataset.stringList = true;
					prefNode.value = getFilterListFromPreference(this.get(id)).join("\n");

					node.classList.add("stringList");
				} else {
					prefNode = document.createElement("input");
					prefNode.type = "text";
					prefNode.value = this.get(id);
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
					beforeInputLabel = document.createElement("label");
					beforeInputLabel.dataset.inputNumberControl = "moins";
					beforeInputLabel.htmlFor = id;
					beforeInputLabel.innerHTML = "<i class=\"material-icons\">remove_circle</i>";

					afterInputLabel = document.createElement("label");
					afterInputLabel.dataset.inputNumberControl = "plus";
					afterInputLabel.htmlFor = id;
					afterInputLabel.innerHTML = "<i class=\"material-icons\">add_circle</i>";

					prefNode.type = "number";
				}
				if(typeof prefObj.minValue === "number"){
					prefNode.min = prefObj.minValue;
				}
				if(typeof prefObj.maxValue === "number"){
					prefNode.max = prefObj.maxValue;
				}
				prefNode.value = parseInt(this.get(id));
				break;
			case "bool":
				prefNode = document.createElement("input");
				prefNode.type = "checkbox";
				prefNode.checked = getBooleanFromVar(this.get(id));
				break;
			case "color":
				prefNode = document.createElement("input");
				prefNode.type = "color";
				prefNode.value = this.get(id);
				break;
			case "control":
				prefNode = document.createElement("button");
				prefNode.textContent = prefObj.label;
				break;
			case "menulist":
				if(Array.isArray(prefObj.options) && prefObj.options.length <= 5){
					prefNode = document.createElement("div");

					const currentValue = this.get(id);
					for(let o in prefObj.options){
						if(prefObj.options.hasOwnProperty(o)){
							let option = prefObj.options[o];

							let optionNode = document.createElement("input");
							optionNode.type = "radio";
							optionNode.id = option.label;
							optionNode.name = id;
							optionNode.value = option.value;
							optionNode.checked = option.value === currentValue;

							prefNode.appendChild(optionNode);

							let optionNodeLabel = document.createElement("label");
							optionNodeLabel.htmlFor = option.label;
							optionNodeLabel.textContent = option.label;
							optionNodeLabel.dataset.translateId = `${id}_${option.value}`;

							prefNode.appendChild(optionNodeLabel);
						}
					}
				} else {
					prefNode = document.createElement("select");
					prefNode.size = 5;

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

					prefNode.value = this.get(id);
				}
				break;
		}
		prefNode.id = id;
		if(prefObj.type !== "control"){
			prefNode.classList.add("preferenceInput");
		}
		if(prefObj.type === "control"){
			prefNode.dataset.translateId = `${id}`;
		}

		prefNode.dataset.settingType = prefObj.type;

		if(prefObj.type === "bool") {
			if(beforeInputLabel!==null){
				node.appendChild(beforeInputLabel);
			}
			node.appendChild(prefNode);
			if(afterInputLabel){
				node.appendChild(afterInputLabel);
			}

			node.appendChild(labelNode);
		} else {
			node.appendChild(labelNode);

			if(beforeInputLabel!==null){
				node.appendChild(beforeInputLabel);
			}
			node.appendChild(prefNode);
			if(afterInputLabel){
				node.appendChild(afterInputLabel);
			}
		}

		let isPanelPage = parent.baseURI.indexOf("panel.html") !== -1;
		if(id.indexOf("_keys_list") !== -1 || (isPanelPage && id.indexOf("_user_id") !== -1) || (!isPanelPage && (id === "statusBlacklist" || id === "statusWhitelist" || id === "gameBlacklist" || id === "gameWhitelist"))){
			node.classList.add("flex_input_text");
		}

		if(typeof prefNode.type === "string" && prefNode.type === "range"){
			output.textContent = `${prefNode.value}${((typeof prefObj.rangeOutputUnit==="string")? prefObj.rangeOutputUnit : "")}`;
			prefNode.addEventListener("change",function(){
				output.textContent = `${prefNode.value}${((typeof prefObj.rangeOutputUnit==="string")? prefObj.rangeOutputUnit : "")}`;
			});
			node.appendChild(output);
		}

		return node;
	}
}
ChromePreferences.prototype.originalGet = ChromePreferences.prototype.get;
ChromePreferences.prototype.get = function(prefId){
	return this.getRealValue(prefId);
};

ChromePreferences.prototype.originalSet = ChromePreferences.prototype.set;
ChromePreferences.prototype.set = function(prefId, value, oldValue=null){
	const getSettableValue = value=>{
		if(this.options.has(prefId) && this.options.get(prefId).type === "integer"){
			if(typeof this.options.get(prefId).minValue === "number" && parseInt(value) < this.options.get(prefId).minValue){
				value = this.options.get(prefId).minValue;
			} else if(typeof this.options.get(prefId).maxValue === "number" && parseInt(value) > this.options.get(prefId).maxValue){
				value = this.options.get(prefId).maxValue;
			}
		}
		if(typeof this.defaultSettings.get(prefId) === "boolean" || typeof this.defaultSettings.get(prefId) === "number"){
			value = value.toString();
		}
		return value;
	};

	const oldExisting = this.has(prefId);
	oldValue = (oldValue===null)? this.has(prefId) : oldValue;
	if(this.loadingState==="success") {
		this.originalSet(prefId, getSettableValue(value));
		browser.storage.local.set({[prefId] : value})
			.catch(err => {
				if(err){
					if(oldExisting===true){
						this.originalDelete(prefId);
					} else {
						this.originalSet(prefId, oldValue);
					}
					console.warn(`Preference Write Error, new data deleted.
${err}`);
				}
			})
		;
	} else {
		console.warn("Still loading Preferences, operation delayed");
		this.loadingPromise.then(()=>{// ()=>{} style of function very important to keep the right "this"
			this.set(prefId, value, oldExisting);
		});
		return this.originalSet(prefId, getSettableValue(value));
	}
};

ChromePreferences.prototype.originalDelete = ChromePreferences.prototype.delete;
ChromePreferences.prototype.delete = function(prefId, oldValue=null){
	if(this.loadingState==="success"){
		oldValue = (oldValue===null)? this.get(prefId) : oldValue;
		browser.storage.local.remove([prefId])
			.catch(err=>{
				if(err){
					this.originalSet(key, oldValue); // Put data back if DB Error
					console.warn(`Preferences Error, old data for the key back.
${err}`);
				}
			})
		;
		return this.originalDelete(prefId);
	} else {
		console.warn("Still loading Preferences, operation delayed");
		this.loadingPromise.then(()=>{// ()=>{} style of function very important to keep the right "this"
			this.delete(prefId, this.get(prefId));
		});
		return this.delete(prefId);
	}
};
