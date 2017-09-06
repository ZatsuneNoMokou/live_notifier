class ZDK{
	constructor(addonJsRoot){
		this.addonJsRoot = addonJsRoot;

		let loadPromise = async ()=>{
			if(typeof browser !== "object" || browser === "null"){
				await this.loadJS(document, ["lib/browser-polyfill.min.js"]);
			}

			let libArray = [
				"lib/i18next.min.js",
				"lib/i18nextXHRBackend.min.js",
				"lib/mustache.min.js",

				"lib/xml2jsobj.js"
			];

			let classesArray = [
				"classes/chrome-notification-controler.js",
				"classes/chrome-preferences.js",
				"classes/i18extended.js",
				"classes/PromiseWaitAll.js",
				"classes/queue.js"
			];

			return await this.loadJS(document, libArray.concat(classesArray));
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


	async loadJS(callerDocument, list, prefix){
		if(prefix===undefined){
			prefix=this.addonJsRoot;
		}
		const isJSLoaded = (callerDocument, src)=>{
			for(let script of callerDocument.scripts){
				if(typeof script.src === "string" && script.src.indexOf(src) !== -1){
					console.log(`"${src}" is already loaded`);
					return true;
				}
			}
			return false;
		};
		const insertJSNode = function(item){
			return new Promise((resolve, reject)=>{
				let newJS = callerDocument.createElement("script");
				newJS.src = chrome.extension.getURL(prefix + item);
				newJS.onload = ()=>{
					newJS.onload = null;
					resolve(true);
				};
				newJS.onerror = reject;
				callerDocument.querySelector("body").appendChild(newJS);
			});
		};

		if(Array.isArray(list) && list.hasOwnProperty(length) === true && list.length > 0) {
			for(let item of list){
				if(isJSLoaded(callerDocument, item)===false){
					await insertJSNode(item);
				}
			}
		} else {
			return "EmptyList";
		}
	}


	/**
	 * Inspired on Underscore's memoize
	 * - With delay to fix memory leak
	 * - Map: Efficiency
	 * - async/await: Promises destined usage
	 * @param {function} fn - Function to memoize
	 * @param {number} [delay] - Delay, in milliseconds, to clean the cached data
	 * @param {function} [hasher]
	 * @returns {function} {memoize}
	 */
	static memoize (fn, delay, hasher) {
		let memoize = async function(key) {
			let cache = memoize.cache;
			const address = '' + (hasher ? hasher.apply(this, arguments) : Array.prototype.slice.call(arguments));
			if(cache.has(address)) {
				clearTimeout(cache.get(address).timer);
			} else {
				cache.set(address, {"data": await fn.apply(this, arguments) });
			}
			if(typeof delay==="number"&&!isNaN(delay)&&delay>0) cache.get(address).timer = window.setTimeout(()=>{ cache.delete(address ); }, delay);
			return cache.get(address).data;
		};
		memoize.cache = new Map();
		return memoize;
	};


	static consoleMsg(level,str){
		let msg = (typeof str.toString === "function")? str.toString() : str;
		if(getPreference("showAdvanced") && getPreference("showExperimented")){
			if(typeof console[level] === "function"){
				console[level](str);
			} else {
				consoleMsg("log", msg);
			}
		}
	}
	static consoleDir(obj,str){
		if(getPreference("showAdvanced") && getPreference("showExperimented")){
			if(typeof str === "string" || (typeof str !== "undefined" && typeof str.toString === "function")){
				console.group((typeof str === "string")? str : str.toString());
				console.dir(obj);
				console.groupEnd();
			} else {
				console.dir(obj);
			}
		}
	}
	static mapToObj(myMap){
		if(myMap instanceof Map){
			let obj = {};
			myMap.forEach((value, index) => {
				obj[index] = (value instanceof Map)? mapToObj(value) : value;
			});
			return obj;
		} else {
			throw 'myMap should be an Map';
		}
	}


	loadImage(obj={}){
		return new Promise((resolve, reject)=>{
			let imgNode;
			if(typeof obj === "object") {
				if(obj.tagName!==undefined && obj.naturalWidth && obj.naturalHeight){
					imgNode = obj;
				} else {
					imgNode = new Image();
					for(let id in obj){
						if(obj.hasOwnProperty(id)){
							imgNode[id] = obj[id];
						}
					}
				}
			} else if(typeof obj === "string") {
				imgNode = new Image();
				imgNode.src = obj;
			} else {
				imgNode = new Image();
				for(let i in obj){
					if(obj.hasOwnProperty(i)){
						imgNode[i] = obj[i];
					}
				}
			}

			if(imgNode.complete===true){
				resolve(imgNode);
			} else {
				const onLoad = ()=>{
					resolve(imgNode);
					imgNode.removeEventListener("load", onLoad);
				};
				imgNode.addEventListener("load", onLoad);
				imgNode.addEventListener("error", reject);
			}
		})
	}
	loadBlob(blob){
		return new Promise((resolve, reject)=>{
			const reader = new FileReader();
			reader.readAsDataURL(blob);
			reader.addEventListener("loadend", function() {
				resolve(reader.result);
			});
			reader.addEventListener("error", reject);
		})
	}
	async getBase64Image(pictureNode, settings={}){
		if(typeof pictureNode.complete==="boolean" && pictureNode.naturalWidth && pictureNode.naturalHeight){
			try{
				await this.loadImage(pictureNode);
			} catch (err){
				console.warn(err)
			}

			const devicePixelDensity = (window.devicePixelRatio>1)? window.devicePixelRatio : 1;
			// Return base64 picture node loaded, and return a promise if not
			let canvas = document.createElement("canvas"),
				pictureRatio = pictureNode.naturalWidth / pictureNode.naturalHeight;

			if( // Allow picture sized generation of the data, in a "contain" mode, to not lose any part of the Image
				(settings.hasOwnProperty("height") && typeof settings.height==="number" && !isNaN(settings.height))
				||
				(settings.hasOwnProperty("width") && typeof settings.width==="number"&&!isNaN(settings.width))
			){
				let newHeight,
					newWidth;
				if((settings.hasOwnProperty("height")&&!settings.hasOwnProperty("width")) || settings.width > settings.height){
					newHeight = devicePixelDensity * settings.height;
					newWidth = devicePixelDensity * settings.height * pictureRatio;
				} else {
					newHeight = devicePixelDensity * settings.width / pictureRatio;
					newWidth = devicePixelDensity * settings.width;
				}
				canvas.height = newHeight;
				canvas.width = newWidth;

				let ctx = canvas.getContext("2d");
				ctx.drawImage(pictureNode, 0, 0, newWidth, newHeight);
			} else {
				canvas.width = pictureNode.naturalWidth;
				canvas.height = pictureNode.naturalHeight;
				let ctx = canvas.getContext("2d");
				ctx.drawImage(pictureNode, 0, 0);
			}
			return canvas;
		} else {
			throw "InvalidParameter";
		}
	}
}


Promise.prototype.complete = function(fn){
	this.then(fn).catch(fn);
};


const splitUri = (function() { // https://codereview.stackexchange.com/questions/9574/faster-and-cleaner-way-to-parse-parameters-from-url-in-javascript-jquery/9630#9630
	const splitRegExp = new RegExp(
		'^' +
		'(?:' +
		'([^:/?#.]+)' +                         // scheme - ignore special characters
		// used by other URL parts such as :,
		// ?, /, #, and .
		':)?' +
		'(?://' +
		'(?:([^/?#]*)@)?' +                     // userInfo
		'([\\w\\d\\-\\u0100-\\uffff.%]*)' +     // domain - restrict to letters,
		// digits, dashes, dots, percent
		// escapes, and unicode characters.
		'(?::([0-9]+))?' +                      // port
		')?' +
		'([^?#]+)?' +                           // path
		'(?:\\?([^#]*))?' +                     // query
		'(?:#(.*))?' +                          // fragment
		'$')
	;

	return function (uri) {
		let split;
		split = uri.match(splitRegExp);
		return {
			'scheme':split[1],
			'user_info':split[2],
			'domain':split[3],
			'port':split[4],
			'path':split[5],
			'query_data': split[6],
			'fragment':split[7]
		}
	};
})();
class Params extends Map {
	encode() {
		const array = [];
		this.forEach((value, key) => {
			array.push((value || typeof value === 'boolean')? `${encodeURI(key)}=${encodeURI(value)}` : `${encodeURI(key)}`);
		});

		return array.join('&');
	}
}
function Request(options){
	if(typeof options.url !== "string" /*&& typeof options.onComplete !== "function"*/){
		consoleMsg("warn", "Error in options");
	} else {
		let core = function(method){
			return new Promise(resolve=>{
				let xhr;
				if(typeof options.anonymous === "boolean"){
					xhr = new XMLHttpRequest({anonymous:options.anonymous});
				} else {
					xhr = new XMLHttpRequest();
				}

				let content = (Array.isArray(options.content) || options.content instanceof Map)? options.content : [];
				if(method === 'GET'){
					// Extract query data from url to put it with the other
					const urlObj = splitUri(options.url);
					if(typeof urlObj.query_data === "string" && urlObj.query_data !== ""){
						let urlQuery = urlObj.query_data.split("&").map(value=>{
							return value.split("=");
						});
						if(Array.isArray(urlQuery)){
							if(Array.isArray(content)){
								content = urlQuery.concat(content);
							} else {
								content = urlQuery;
							}
							options.url = options.url.replace("?"+urlObj.query_data, "");
						}
					}
				}

				const params = new Params(content);

				xhr.open(method, ((method === 'GET')? `${options.url}${(params.size > 0)? `?${params.encode()}` : ""}` : options.url), true);

				if(typeof options.contentType === "string"){
					xhr.responseType = options.contentType;
				}
				if(typeof options.overrideMimeType === "string"){
					xhr.overrideMimeType(options.overrideMimeType);
				}

				xhr.timeout = getPreference("timeout_delay") * 1000;

				if(options.hasOwnProperty("headers") === true && typeof options.headers === "object"){
					for(let header in options.headers){
						if(!options.headers.hasOwnProperty(header)){ // Make sure to not loop constructors
							continue;
						}
						let value = options.headers[header];
						xhr.setRequestHeader(header, value);
					}
				}

				xhr.addEventListener("loadend", function(){
					let response = {
						"url": xhr.responseURL,
						"json": null,
						"status": xhr.status,
						"statusText": xhr.statusText,
						"header": xhr.getAllResponseHeaders()
					};
					if(xhr.responseType === "" || xhr.responseType === "text"){
						response.text= xhr.responseText;
					}
					if(typeof xhr.response !== "undefined"){
						response.response = xhr.response;
					}

					if(typeof options.customJSONParse === "string"){
						switch(options.customJSONParse){
							case "xmlToJSON":
								if(typeof xhr.responseXML === "undefined" || xhr.responseXML === null){
									response.json = null;
								} else {
									let xmlToStringParser = new XMLSerializer();
									let xmlText = xmlToStringParser.serializeToString(xhr.responseXML);

									try{
										// Source: https://www.sitepoint.com/how-to-convert-xml-to-a-javascript-object/
										let rawData = XML2jsobj(xhr.responseXML.documentElement);
										let data = {};

										/**		Flatten the object a bit		**/
										if(rawData.hasOwnProperty("body")){
											data = rawData.body;
											if(rawData.hasOwnProperty("version")){
												data.version = rawData.version;
											}
										} else {
											data = rawData;
										}
										/**		End flatten the object a bit		**/

										response.json = data;
									}
									catch(error){
										response.json = null;
									}
								}
								break;
							case "urlencodedToJSON":
								let jsonDATA = {};
								let splitedData = xhr.responseText.split("&");

								splitedData = splitedData.map((str)=>{
									return str.split("=");
								});
								for(let item of splitedData){
									jsonDATA[decodeURIComponent(item[0])] = decodeURIComponent(item[1]);
								}
								response.json = jsonDATA;
								break;
							default:
								consoleMsg("warn", `[Request] Unknown custom JSON parse ${options.customJSONParse}`);
						}
					} else if(xhr.responseType === "document" && typeof options.Request_documentParseToJSON === "function"){
						let result = options.Request_documentParseToJSON(xhr);
						if(result instanceof Map){
							response.map = result;
							response.json = mapToObj(result);
						} else {
							response.json = result;
						}
					} else {
						try{response.json = JSON.parse(xhr.responseText);}
						catch(error){response.json = null;}
					}

					if(typeof options.onComplete==="function"){
						options.onComplete(response);
					}
					resolve(response);
				});


				if(method === 'GET'){
					xhr.send();
				} else if(method === 'POST'){
					xhr.send(params.encode());
				} else {
					throw `Unknown method "${method}"`
				}
			});
		};


		return {
			'get' : function() {
				return core('GET');
			},
			'post' : function() {
				return core('POST');
			}
		};
	}
}