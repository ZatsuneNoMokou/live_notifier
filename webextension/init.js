const zDK = new ZDK("/data/js/");

if(browser.extension.getBackgroundPage() !== null){
	browser.extension.getBackgroundPage().zDK = zDK;
}
async function loadMustacheTemplates(map) {
	let templatePromises = new Map(),
		templateMap = new Map();

	map.forEach((url, id) => {
		templatePromises.set(id, Request({
			url: chrome.extension.getURL(url)
		}).get())
	});

	const templatesData = await PromiseWaitAll(templatePromises);
	for(let templateId in templatesData){
		if(templatesData.hasOwnProperty(templateId)){
			templateMap.set(templateId, templatesData[templateId].text);
			Mustache.parse(templateMap.get(templateId)); // Pre-parsing/Caching Template, optional, speeds up future uses
		}
	}
	return templateMap;
}

// appGlobal: Accessible with browser.extension.getBackgroundPage();
var appGlobal = {};

(async ()=>{
	const err = err=>{
		// Error occured
		throw err;
	};
	await zDK.loadingPromise;
	await zDK.loadJS(document, [
		"options-data.js",
		"options-api.js",
		"voiceAPI.js"
	]);

	const templatesSource = new Map();
	templatesSource.set("backgroundTheme", "/data/js/backgroundTheme.mst");

	templatesSource.set("streamTemplate", "/data/js/panel/streamTemplate.mst");
	templatesSource.set("streamPictureTemplate", "/data/js/panel/streamPictureTemplate.mst");
	templatesSource.set("streamListTemplate", "/data/js/panel/streamListTemplate.mst");
	loadMustacheTemplates(templatesSource)
		.then(async (loadMap)=>{
			appGlobal.mustacheTemplates = loadMap;
			await chromeSettings.loadingPromise;
			await zDK.loadJS(document, ["backgroundTheme.js"]);
		})
	;
	await PromiseWaitAll([chromeSettings.loadingPromise, i18ex.loadingPromise]);
	await zDK.loadJS(document, ["index.js"]);
})();
