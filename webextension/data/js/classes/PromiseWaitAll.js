function isMap(myMap){
	return (myMap instanceof Map || myMap.constructor.name === "Map");
}
function PromiseWaitAll(promises){
	if(Array.isArray(promises) || isMap(promises)){
		let count = (isMap(promises))? promises.size : promises.length;
		let results = {};
		return new Promise(function(resolve, reject){
			promises.forEach((promise, index) => {
				let handler = data => {
					results[index] = data;
					if(--count === 0){
						resolve(results);
					}
				};

				if(promise instanceof Promise){
					promise.then(handler);
					promise.catch(handler);
				} else {
					handler(promise);
				}
			});
			if(count === 0){
				resolve(results);
			}
		});
	} else {
		throw "promises should be an Array or Map of Promise"
	}
}