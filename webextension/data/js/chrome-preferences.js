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

		let loadPromise = ()=>{
			return new Promise(resolve=>{
				browser.storage.local.get(null)
					.then(currentLocalStorage=>{
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
						Object.defineProperty(this, "loadingState", {
							value: "success",
							configurable: true,
							writable: false
						});
						resolve(true);
					})
					.catch(err=>{
						Object.defineProperty(this, "loadingState", {
							value: "failed",
							configurable: true,
							writable: false
						});
						throw err;
					})
				;
			})
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
