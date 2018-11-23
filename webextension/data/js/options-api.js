'use strict';

let chromeSettings,
	i18ex
;
if(browser.extension.getBackgroundPage() !== null){
	const backgroundPage = browser.extension.getBackgroundPage();
	if(backgroundPage.hasOwnProperty("chromeSettings")){
		chromeSettings = backgroundPage.chromeSettings;
	} else {
		chromeSettings = backgroundPage.chromeSettings = new ChromePreferences(options);
	}

	if(backgroundPage.hasOwnProperty("i18ex")){
		i18ex = backgroundPage.i18ex;
	} else {
		i18ex = backgroundPage.i18ex = new i18extended(browser.i18n.getMessage("language"));
	}
}

/*		---- Nodes translation ----		*/
function translateNodes(){
	for(let node of document.querySelectorAll("[data-translate-id]")){
		if(typeof node.tagName === "string"){
			node.textContent = i18ex._(node.dataset.translateId);
			delete node.dataset.translateId;
		}
	}
}
if (typeof Opentip !== "undefined") {
	Opentip.styles.myDark = {
		// Make it look like the alert style. If you omit this, it will default to "standard"
		extends: "dark",
		background: "#212121",
		borderColor: "#212121"
	};
	if(browser.extension.getBackgroundPage() !== null) {
		const {appGlobal} = browser.extension.getBackgroundPage(),
			delegate = new Delegate(document.body)
		;
		if(appGlobal.hasTouch(window)){
			delegate.on("touchstart", '[data-opentip-id]', function () {
				const i = this.dataset.opentipId;
				if(Opentip.tips[i-1]){
					const openTip = Opentip.tips[i-1];
					setTimeout(function () {
						openTip.hide();
					}, 3000);
				}
			});
		}
		delegate.on('mouseover', '[data-opentip-id]', function () {
			this.classList.add('opentip-hover');
		});
		delegate.on('mouseout', '[data-opentip-id]', function () {
			this.classList.remove('opentip-hover');
		});
	}
	Opentip.defaultStyle = "myDark"; // The default is "standard"
}

function translateNodes_title(){
	for(let node of document.querySelectorAll("[data-translate-title]")){
		if(typeof node.tagName === "string"){
			const titleText =  i18ex._(node.dataset.translateTitle);

			let error = false;
			try{
				const Ot = Opentip;
				if(node.dataset.tooltipPosition){
					const myOpentip = new Ot(node, titleText, "", {
						"tipJoint": node.dataset.tooltipPosition
					})
				} else {
					const myOpentip = new Ot(node, titleText)
				}
			} catch (err){
				console.warn(err);
				error = true;
			}

			if(error===false){
				delete node.dataset.translateTitle;
				node.removeAttribute("title");
			}
		}
	}
}

function loadTranslations(){
	i18ex.loadingPromise
		.then(()=>{
			let observer = new MutationObserver(function(mutations) {
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
			observer.observe(document.body, config);

			// later, you can stop observing
			//observer.disconnect();
		})
	;
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
		node = this,
		settingName = (node.tagName.toLowerCase() === "input" && typeof node.type==="string" && node.type.toLowerCase() === "radio")? node.name : node.id
	;

	if (node.validity.valid) {
		if (node.dataset.settingType) {
			const data = backgroundPage.getValueFromNode(node);
			if(data!==undefined){
				savePreference(settingName, data);
			} else {
				console.error(`${settingName} value was incorrect.`);
			}
		} else {
			savePreference(settingName, backgroundPage.getValueFromNode(node));
		}
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
				case "json":
					prefNode.value = JSON.stringify(prefValue);
					break;
				case "string":
					if(typeof chromeSettings.options.get(prefId).stringList === "boolean" && chromeSettings.options.get(prefId).stringList === true){
						prefNode.value = backgroundPage.getFilterListFromPreference(getPreference(prefId)).join("\n");
					} else {
						prefNode.value = prefValue;
					}
					break;
				case "color":
				case "menulist":
					if(prefNode.tagName.toLowerCase()==="div"){
						const toCheck = prefNode.querySelector(`[value="${prefValue}"]`);
						if(toCheck){
							toCheck.checked = true;
						} else {
							console.warn(`Error trying to update "${prefId}"`);
						}
					} else {
						prefNode.value = prefValue;
					}
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
				body.classList.toggle("showAdvanced", getPreference("showAdvanced"));
			}
			if(prefId === "showExperimented"){
				body.classList.toggle("showExperimented", getPreference("showExperimented"));
			}
			if(prefId === "panel_theme" || prefId === "background_color" && typeof theme_update === "function"){
				theme_update();
			}
			if(
				typeof applyPanelSize === "function"
				&&
				(prefId === "panel_height" || prefId === "panel_width")
			){
				applyPanelSize();
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
				status.textContent = i18ex._("options_saved_sync");

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
if(browser.extension.getBackgroundPage()!==null && typeof Delegate!=="undefined") {
	const delegate = (function () {
		// const Delegate = domDelegate.Delegate;
		return new Delegate(document.body);
	})();
	const liveEvent = function (type, selector, handler) {
		delegate.on(type, selector, handler);
	};

	liveEvent("click", "[data-input-number-control]", function (e){
		const label = this,
			input = label.control,
			action = label.dataset.inputNumberControl
		;
		if (action === "moins" || action === "plus") {
			input[action === "plus" ? "stepUp" : "stepDown"](1);
			settingNode_onChange.apply(input, [e, input])
		}
		return false;
	});
	liveEvent("input", "[data-setting-type='string'],[data-setting-type='json']", settingNode_onChange);
	liveEvent("change", "[data-setting-type='integer'],[data-setting-type='bool'],[data-setting-type='color'],input[data-setting-type='menulist'],[data-setting-type='menulist'] input[type='radio']", settingNode_onChange);
	liveEvent("click", "#export_preferences", exportPrefsToFile);
	liveEvent("click", "#import_preferences", importPrefsFromFile);
	liveEvent("click", "[id$='_import']", import_onClick); // [id$='_import'] => Every id that end with _import

	const backgroundPage = browser.extension.getBackgroundPage();
	backgroundPage.zDK.appendTo(document.body, "<div id='tooltip' class='hide'></div>", document);
}



/*		---- Import/Export preferences from file ----		*/
function exportPrefsToFile(){
	let backgroundPage = browser.extension.getBackgroundPage();
	backgroundPage.chromeSettings.exportPrefsToFile("live_notifier", document);
}
async function importPrefsFromFile(event){
	const backgroundPage = browser.extension.getBackgroundPage();
	let mergePreferences = (typeof event === "object" && typeof event.shiftKey === "boolean")? event.shiftKey : false;

	console.warn("Merge: " + mergePreferences);

	let error = false;
	try {
		await backgroundPage.chromeSettings.importPrefsFromFile("live_notifier", mergePreferences, document);
	} catch (e){
		error = true;
		console.error(e);
	}

	if (error === false) {
		if (typeof refreshStreamsFromPanel === "function") {
			refreshStreamsFromPanel();
		} else {
			sendDataToMain("refreshStreams","");
		}
	}
}

function chromePreferences_initHooks() {
	const simpleJSONCheck = /^{.*}$/i;

	/**
	 *
	 * @param {String} prefId
	 * @param {Object} preferences
	 * @param {Boolean} mergePreferences
	 * @returns {String}
	 */
	const filterPrefId = function (prefId, preferences, mergePreferences) {
		if (prefId === "hitbox_user_id") {
			preferences["smashcast_user_id"] = preferences["hitbox_user_id"];
			delete preferences["hitbox_user_id"];
			prefId="smashcast_user_id";
		}

		if (prefId === "beam_user_id") {
			preferences["mixer_user_id"] = preferences["beam_user_id"];
			delete preferences["beam_user_id"];
			prefId="mixer_user_id";
		}

		return prefId;
	};

	/**
	 *
	 * @param {*} prefValue
	 * @param {Object} preferences
	 * @param {Boolean} mergePreferences
	 * @param {String} prefId
	 * @returns {String}
	 */
	const filterPrefValue = function (prefValue, preferences, mergePreferences, prefId) {
		if (mergePreferences === true) {
			let oldPref = getPreference(prefId),
				newPrefArray
			;



			switch (prefId) {
				case "stream_keys_list":
					let streamListSetting = new appGlobal.StreamListFromSetting(false);

					streamListSetting.parseSetting(importedPrefValue).forEach((websiteMap, website) => {
						websiteMap.forEach((streamSetting, id) => {
							let newStreamSettings;
							if(streamListSetting.streamExist(website, id)){
								newStreamSettings = streamListSetting.streamExist(website, id);
							} else {
								newStreamSettings = StreamListFromSetting.getDefault();
							}

							for(let settingName in streamSetting){
								if(streamSetting.hasOwnProperty(settingName)){
									newStreamSettings[settingName] = streamSetting[settingName];
								}
							}

							streamListSetting.mapDataAll.get(website).set(id, newStreamSettings);
						});
					});

					streamListSetting.update();

					// Return null to not let ChromePreferences save the preference by itself
					return null;

				case "statusBlacklist":
				case "statusWhitelist":
				case "gameBlacklist":
				case "gameWhitelist":
					let toLowerCase = (str)=>{return str.toLowerCase()};
					let oldPrefArrayLowerCase = oldPref.split(/,\s*/).map(toLowerCase);
					newPrefArray = oldPref.split(/,\s*/);
					importedPrefValue.split(/,\s*/).forEach(value=>{
						if(oldPrefArrayLowerCase.indexOf(value.toLowerCase()) === -1){
							newPrefArray.push(value);
						}
					});

					return newPrefArray.join(",");
			}
		} else if (prefId === 'stream_keys_list' && simpleJSONCheck.test(this.get(prefId)) === false) {
			savePreference(prefId, importedPrefValue);
			let streamList = new appGlobal.StreamListFromSetting(true);
			streamList.refresh(true);

			// Return null to not let ChromePreferences save the preference by itself
			return null;
		}

		return prefValue;
	};



	chromeSettings.addFilter(chromeSettings.FILTERS.IMPORT_FILE_PREF_ID, filterPrefId);
	chromeSettings.addFilter(chromeSettings.FILTERS.IMPORT_FILE_PREF_VALUE, filterPrefValue);
}



/*				---- Update SyncController ----				*/

/**
 *
 * @param {function} updateSyncData
 */
function initSyncControl(updateSyncData) {
	let haveAutomaticSync = getPreference('automaticSync'),
		dropboxClientId = getPreference('dropboxClientId'),
		dropboxAuthToken = getPreference('dropboxClientAuthToken')
	;

	/**
	 *
	 * @type {?DropboxController}
	 */
	let dropboxController = null;
	if (haveAutomaticSync === true) {
		dropboxController = DropboxController.updateController(dropboxClientId, dropboxAuthToken);
	}


	/**
	 *
	 * @type {Map<String, String>}
	 */
	const updatedPreferences = new Map();

	/**
	 *
	 * @type {?Promise}
	 */
	let logginPromise = null;

	/**
	 *
	 * @function
	 */
	const uploadSyncData = _.debounce(function () {
		if (haveAutomaticSync === true && dropboxController === null && logginPromise === null) {
			logginPromise = new DropboxController(null, clientId).getAuthToken();
			logginPromise
				.then(authToken => {
					console.dir(authToken)
					savePreference('dropboxClientAuthToken', authToken);
					logginPromise = null;
				})
				.catch(err => {
					console.error(err);
					logginPromise = null;
				})
			;
		}

		updateSyncData(syncInterval, dropboxController, updatedPreferences)
			.catch(err=>{
				consoleMsg('error', err);
			})
		;
	}, 1000, {
		maxWait: 10000
	});



	browser.storage.onChanged.addListener((changes, area) => {
		if (area === "local") {
			for(let prefId in changes) {
				if(changes.hasOwnProperty(prefId)){
					switch(prefId) {
						case "dropboxClientId":
							dropboxClientId = changes[prefId].newValue;
							break;
						case "dropboxClientAuthToken":
							dropboxAuthToken = changes[prefId].newValue;
							break;
						case "automaticSync":
							haveAutomaticSync = changes[prefId].newValue;
							break;
					}

					if (prefId !== CHROME_PREFERENCES_SYNC_ID && chromeSettings.defaultSettingsSync.has(prefId) && updatedPreferences.has(prefId) === false) {
						updatedPreferences.set(prefId, '');
					}
				}
			}

			if (updatedPreferences.size > 0) {
				if (haveAutomaticSync === true) {
					if (updatedPreferences.has('automaticSync') || updatedPreferences.has('dropboxClientId') || updatedPreferences.has('dropboxClientAuthToken')) {
						dropboxController = DropboxController.updateController(dropboxClientId, dropboxAuthToken, dropboxController);
					}

					uploadSyncData();
				} else {
					dropboxController = null;
				}
			}
		}
	});



	/**
	 *
	 * @type {ZTimer}
	 */
	const syncInterval = ZTimer.setInterval('syncInterval', 10, 'm', function (){
		uploadSyncData()
			.catch(err=>{
				consoleMsg('error', err);
			})
		;
	});



	if (dropboxController !== null) {
		uploadSyncData();
	}
}
