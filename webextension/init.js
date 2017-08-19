const zDK = new ZDK("/data/js/");

if(browser.extension.getBackgroundPage() !== null){
	browser.extension.getBackgroundPage().zDK = zDK;
}
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
					zDK.loadJS(document, [
						"backgroundTheme.js"
					]);
					PromiseWaitAll([chromeSettings.loadingPromise, i18ex.loadingPromise])
						.then(()=>{
							zDK.loadJS(document, [
								"index.js"
							])
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
