function loadJS(callerDocument, prefix, list){
	return new Promise(function(resolve, reject){
		if(Array.isArray(list) && list.hasOwnProperty(length) === true && list.length > 0){
			for(let script of callerDocument.scripts){
				if(typeof script.src === "string" && script.src.indexOf(list[0]) !== -1){
					console.log(`"${list[0]}" is already loaded`);
					list.shift();
					loadJS(callerDocument, prefix, list)
						.then(resolve)
						.catch(reject);
					return false;
				}
			}
			
			let newJS = callerDocument.createElement("script");
			newJS.src = chrome.extension.getURL(prefix + list[0]);
			newJS.onload = function(){
				newJS.onload = null;
				list.shift();
				loadJS(callerDocument, prefix, list)
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
