class ZDK{
	constructor(addonJsRoot){
		this.addonJsRoot = addonJsRoot;

		let loadPromise = ()=>{
			return new Promise((resolve, reject)=>{
				let libArray = [
					"lib/i18next.min.js",
					"lib/i18nextXHRBackend.min.js",

					"lib/xml2jsobj.js"
				];

				let classesArray = [
					"classes/chrome-notification-controler.js",
					"classes/chrome-preferences.js",
					"classes/i18extended.js",
					"classes/PromiseWaitAll.js",
					"classes/queue.js"
				];

				this.loadJS(document, libArray.concat(classesArray))
					.then(resolve)
					.catch(reject)
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


		this.loadingPromise
			.then(()=>{
				Object.defineProperty(this, "ChromeNotificationControler", {
					value: ChromeNotificationControler,
					configurable: false,
					writable: false
				});
				Object.defineProperty(this, "ChromePreferences", {
					value: ChromePreferences,
					configurable: false,
					writable: false
				});
				Object.defineProperty(this, "i18extended", {
					value: i18extended,
					configurable: false,
					writable: false
				});
				Object.defineProperty(this, "queue", {
					value: queue,
					configurable: false,
					writable: false
				});


				Object.defineProperty(this, "loadingState", {
					value: "success",
					configurable: true,
					writable: false
				});
			})

			.catch(()=>{
				Object.defineProperty(this, "loadingState", {
					value: "failed",
					configurable: true,
					writable: false
				});
			})
		;
	}

	loadJS(callerDocument, list, prefix){
		const zDK = this;
		if(prefix===undefined){
			prefix=this.addonJsRoot;
		}
		return new Promise(function(resolve, reject){
			if(Array.isArray(list) && list.hasOwnProperty(length) === true && list.length > 0){
				for(let script of callerDocument.scripts){
					if(typeof script.src === "string" && script.src.indexOf(list[0]) !== -1){
						console.log(`"${list[0]}" is already loaded`);
						list.shift();
						zDK.loadJS(callerDocument, list, prefix)
							.then(resolve)
							.catch(reject);
						return false;
					}
				}

				let newJS = callerDocument.createElement("script");
				newJS.src = chrome.extension.getURL(prefix + list[0]);
				newJS.onload = ()=>{
					newJS.onload = null;
					list.shift();
					zDK.loadJS(callerDocument, list, prefix)
						.then(resolve)
						.catch(reject)
				};
				callerDocument.querySelector("body").appendChild(newJS);
				return true;
			} else {
				resolve("EmptyList");
			}
		})
	}
}