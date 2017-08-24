const zDK = new ZDK("/data/js/");

if(browser.extension.getBackgroundPage() !== null){
	browser.extension.getBackgroundPage().zDK = zDK;
}
function loadMustacheTemplates(map) {
	let templatePromises = new Map();
	map.forEach((url, id) => {
		templatePromises.set(id, Request({
			url: chrome.extension.getURL(url)
		}).get())
	});
	return new Promise((resolve, reject)=>{
		PromiseWaitAll(templatePromises)
			.then(templatesData=>{
				let templateMap = new Map();
				for(let templateId in templatesData){
					if(templatesData.hasOwnProperty(templateId)){
						templateMap.set(templateId, templatesData[templateId].text);
						Mustache.parse(templateMap.get(templateId)); // Pre-parsing/Caching Template, optional, speeds up future uses
					}
				}
				resolve(templateMap);
			})
			.catch(reject)
		;
	});
}

// appGlobal: Accessible with browser.extension.getBackgroundPage();
var appGlobal = {};

(()=>{
	const err = err=>{
		// Error occured
		throw err;
	};
	zDK.loadingPromise
		.then(()=>{
			zDK.loadJS(document, [
				"options-data.js",
				"options-api.js",
				"voiceAPI.js"
			])
				.then(()=>{
					const templatesSource = new Map();
					templatesSource.set("backgroundTheme", "/data/js/backgroundTheme.mst");

					templatesSource.set("streamTemplate", "/data/js/panel/streamTemplate.mst");
					templatesSource.set("streamListTemplate", "/data/js/panel/streamListTemplate.mst");
					loadMustacheTemplates(templatesSource)
						.then(loadMap=>{
							appGlobal.mustacheTemplates = loadMap;
							chromeSettings.loadingPromise
								.then(()=>{
									zDK.loadJS(document, ["backgroundTheme.js"])
										.catch(err)
									;
								})
							;
						})
					;
					PromiseWaitAll([chromeSettings.loadingPromise, i18ex.loadingPromise])
						.then(()=>{
							zDK.loadJS(document, ["index.js"])
								.catch(err)
							;
						})
						.catch(err)
					;
				})
				.catch(err)
		})
	;
})();
