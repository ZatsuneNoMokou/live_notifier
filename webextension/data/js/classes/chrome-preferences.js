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
								super.set(prefId, currentLocalStorage[prefId]);
							} else {
								super.set(prefId, currentLocalStorage[prefId]);
								console.warn(`${prefId} ${prefId.length} has no default value (value: ${currentLocalStorage[prefId]})`);
							}
						}
					}

					// Load default settings for the missing settings without saving them in the storage
					this.defaultSettings.forEach((pref, prefId)=>{
						if(!this.has(prefId)){
							super.set(prefId, pref);
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


	get(prefId){
		return this.getRealValue(prefId);
	}

	set(prefId, value, oldValue=null){
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
			super.set(prefId, getSettableValue(value));
			browser.storage.local.set({[prefId] : value})
				.catch(err => {
					if(err){
						if(oldExisting===true){
							super.delete(prefId);
						} else {
							super.set(prefId, oldValue);
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
			return super.set(prefId, getSettableValue(value));
		}
	}

	"delete"(prefId, oldValue=null){
		if(this.loadingState==="success"){
			oldValue = (oldValue===null)? this.get(prefId) : oldValue;
			browser.storage.local.remove([prefId])
				.catch(err=>{
					if(err){
						super.set(key, oldValue); // Put data back if DB Error
						console.warn(`Preferences Error, old data for the key back.
${err}`);
					}
				})
			;
			return super.delete(prefId);
		} else {
			console.warn("Still loading Preferences, operation delayed");
			this.loadingPromise.then(()=>{// ()=>{} style of function very important to keep the right "this"
				this.delete(prefId, this.get(prefId));
			});
			return this.delete(prefId);
		}
	}


	getRealValue(prefId){
		if(this.has(prefId)){
			const current_pref = super.get(prefId);
			if(this.options.has(prefId)) {
				switch (this.options.get(prefId).type) {
					case "string":
					case "color":
					case "menulist":
						return current_pref;
						break;
					case "integer":
						if (isNaN(parseInt(current_pref))) {
							console.warn(`${prefId} is not a number (${current_pref})`);
							return this.defaultSettings.get(prefId);
						} else if (typeof this.options.get(prefId).minValue === "number" && parseInt(current_pref) < this.options.get(prefId).minValue) {
							return this.options.get(prefId).minValue;
						} else if (typeof this.options.get(prefId).maxValue === "number" && parseInt(current_pref) > this.options.get(prefId).maxValue) {
							return this.options.get(prefId).maxValue;
						} else {
							return parseInt(current_pref);
						}
						break;
					case "bool":
						return getBooleanFromVar(current_pref);
						break;
						break;
					case "file":
						return current_pref;
						break;
				}
			} else {
				console.warn(`Unknown preference "${prefId}"`);
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


	/**
	 *
	 * @param {HTMLElement} container
	 */
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

	/**
	 *
	 * @param {HTMLElement} parent
	 * @param {String} id
	 * @return {HTMLDivElement}
	 */
	newPreferenceNode(parent, id){
		const prefObj = this.options.get(id);

		let node = document.createElement("div");
		node.classList.add("preferenceContainer");
		node.classList.add("preferenceContainer--" + id);
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
			beforeInputNode = null,
			afterInputNode = null,
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
					beforeInputNode = document.createElement("label");
					beforeInputNode.dataset.inputNumberControl = "moins";
					beforeInputNode.htmlFor = id;
					beforeInputNode.innerHTML = "<i class=\"material-icons\">remove_circle</i>";

					afterInputNode = document.createElement("label");
					afterInputNode.dataset.inputNumberControl = "plus";
					afterInputNode.htmlFor = id;
					afterInputNode.innerHTML = "<i class=\"material-icons\">add_circle</i>";

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
			case "file":
				prefNode = document.createElement("button");
				prefNode.textContent = prefObj.label;

				beforeInputNode = document.createElement("output");
				beforeInputNode.id = id;
				const filePrefValue = this.get(id);
				if(filePrefValue!==null && typeof filePrefValue==="object" && filePrefValue.hasOwnProperty("name")){
					beforeInputNode.textContent = filePrefValue.name;
				}

				afterInputNode = document.createElement("button");
				afterInputNode.id = id;
				afterInputNode.dataset.settingType = prefObj.type;
				afterInputNode.dataset.action = "delete";
				afterInputNode.dataset.translateId = "Delete";
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
		if(prefObj.type === "control" || prefObj.type === "file"){
			prefNode.dataset.translateId = `${id}`;
		}

		prefNode.dataset.settingType = prefObj.type;

		if(prefObj.type === "bool") {
			if(beforeInputNode!==null){
				node.appendChild(beforeInputNode);
			}
			node.appendChild(prefNode);
			if(afterInputNode){
				node.appendChild(afterInputNode);
			}

			node.appendChild(labelNode);
		} else {
			node.appendChild(labelNode);

			if(beforeInputNode!==null){
				node.appendChild(beforeInputNode);
			}
			node.appendChild(prefNode);
			if(afterInputNode){
				node.appendChild(afterInputNode);
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

	/**
	 *
	 * @param {String} appName
	 * @param {HTMLDocument} doc
	 */
	async exportPrefsToFile(appName, doc=document){
		let exportData = {
			"preferences": this.getSyncPreferences()
		};

		exportData[`${appName}_version`] = browser.runtime.getManifest().version;



		const iframe = doc.body.appendChild(doc.createElement('iframe'));
		iframe.classList.add("hidden");

		let link = doc.createElement("a");
		link.setAttribute("download", `${appName}_preferences.json`);

		const url = URL.createObjectURL(new Blob([
				JSON.stringify(exportData, null, '\t')
			], {type: 'application/json'}))
		;

		link.href = url;

		await ZDK.setTimeout();
		link = iframe.contentDocument.importNode(link, true);
		iframe.contentDocument.body.appendChild(link);

		await ZDK.setTimeout();
		link.dispatchEvent(new MouseEvent('click'));

		await ZDK.setTimeout(1000);
		URL.revokeObjectURL(url);
		iframe.remove();
	}

	/**
	 *
	 * @param {HTMLDocument=document} doc
	 * @param {Object=null} opts
	 * @param {String=null} opts.readType
	 * @param {Number=null} opts.fileMaxSize
	 * @param {RegExp=null} opts.fileTypes
	 * @param {String=null} opts.inputAccept
	 * @return {Promise<FileList>}
	 */
	importDataFormFiles(doc=document, opts=null){
		return new Promise((resolve, reject) => {
			if(opts===null && typeof opts!=="object"){
				reject("Wrong argument");
				return;
			}
			if(!opts.hasOwnProperty("readType")){
				opts.readType = null
			}
			if(!opts.hasOwnProperty("fileMaxSize")){
				opts.fileMaxSize = null
			}
			if(!opts.hasOwnProperty("fileTypes")){
				opts.fileTypes = null
			}
			if(!opts.hasOwnProperty("inputAccept")){
				opts.inputAccept = null
			}

			let node = doc.createElement("input");
			node.type = "file";
			node.className = "hide";
			if(opts.inputAccept!==null){
				node.accept = opts.inputAccept;
			}

			node.addEventListener("change", async function(){
				node.remove();

				if(typeof node.files !== "undefined"){
					let promiseList = [];
					for(let file of node.files) {
						if(opts.fileMaxSize!==null && file.size>opts.fileMaxSize) {
							promiseList.push({
								"error": "FileTooBig"
							});
						} else if(opts.fileTypes!==null && opts.fileTypes instanceof RegExp && !opts.fileTypes.test(file.type)){
							promiseList.push({
								"error": "WrongFileType"
							});
						} else {
							if(opts.readType!==null){
								promiseList.push(zDK.loadBlob(file, opts.readType));
							} else {
								promiseList.push(zDK.loadBlob(file));
							}
						}
					}

					let dataObj = await PromiseWaitAll(promiseList),
						outputData= []
					;

					for(let index in dataObj){
						if(dataObj.hasOwnProperty(index)){
							if(typeof dataObj[index]==="string"){
								outputData[index] = {
									"name": node.files[index].name,
									"data": dataObj[index]
								};
							} else {
								outputData[index] = {
									"name": node.files[index].name,
									"error": (typeof dataObj[index]==="object" && dataObj[index].hasOwnProperty("error"))? dataObj[index].error : dataObj[index]
								};
							}
						}
					}

					resolve(outputData);
				} else {
					reject();
				}
			});

			doc.head.appendChild(node);
			ZDK.simulateClick(node);
		});
	}

	async prefNode_FileType_onChange(event){
		const {target: prefNode} = event,
			settingName = prefNode.id,
			outputNode = prefNode.ownerDocument.querySelector(`output[id="${prefNode.id}"]`)
		;

		if(prefNode.dataset.action!==undefined && prefNode.dataset.action==="delete"){
			this.set(prefNode.id, chromeSettings.defaultSettings.get(prefNode.id));

			if(outputNode!==null){
				outputNode.textContent = "";
			}
		} else {
			const prefObj = this.options.get(prefNode.id);

			let fileMaxSize = (prefObj.hasOwnProperty("fileMaxSize") && prefObj.fileMaxSize!=="null")? prefObj.fileMaxSize : null;
			if(typeof fileMaxSize==="string"){
				const number = parseInt(fileMaxSize);
				if(!isNaN(number)){
					fileMaxSize = number;
				}
			}

			let filesData = null;

			try {
				filesData = await this.importDataFormFiles(prefNode.ownerDocument, {
					"fileMaxSize": fileMaxSize,
					"readType": (prefObj.hasOwnProperty("readType"))? prefObj.readType : "dataUrl",
					"fileTypes": (prefObj.hasOwnProperty("fileTypes") && prefObj.fileTypes instanceof RegExp)? prefObj.fileTypes : null,
					"inputAccept": (prefObj.hasOwnProperty("inputAccept"))? prefObj.inputAccept : null
				});
			} catch(e){
				console.warn(e);
			}

			if(Array.isArray(filesData) && filesData.length>0){
				if(filesData[0].hasOwnProperty("data")){
					savePreference(settingName, filesData[0]);

					if(outputNode!==null){
						outputNode.textContent =  filesData[0].name;
					}
				} else {
					const error = filesData[0].error;

					if(error==="WrongFileType" || error==="FileTooBig"){
						const errorMsg = document.createElement("span");
						errorMsg.classList.add("error");
						errorMsg.textContent = i18ex._(error);
						outputNode.appendChild(errorMsg);

						setTimeout(()=>{
							errorMsg.remove();
						}, 2000);
					}
				}
			}
		}
	}

	/**
	 *
	 * @param {String} appName
	 * @param {Boolean} mergePreferences
	 * @param {HTMLDocument} doc
	 */
	async importPrefsFromFile(appName, mergePreferences, doc=document){
		let files = await this.importDataFormFiles(doc, {
			"readType": "text"
		});

		if(files.length === 0 || files.length > 1){
			throw `[Input error] ${node.files.length} file(s) loaded`;
		} else {
			let file_JSONData = null;
			try{
				file_JSONData = JSON.parse(files[0].data);
			} catch(error){
				if(error.message && error.message.indexOf("SyntaxError") !== -1){
					throw `An error occurred when trying to parse file (Check the file you have used)`;
				} else {
					throw `An error occurred when trying to parse file (${error})`;
				}
			}
			if(file_JSONData !== null){
				if(file_JSONData.hasOwnProperty(`${appName}_version`) && file_JSONData.hasOwnProperty("preferences") && typeof file_JSONData.preferences === "object"){
					this.importFromJSON(file_JSONData.preferences, (typeof mergePreferences==="boolean")? mergePreferences : false);
					return true;
				} else {
					throw `An error occurred when trying to parse file (Check the file you have used)`;
				}
			}
		}
	}
}
