class ZDK{
	constructor(addonJsRoot){
		this.addonJsRoot = addonJsRoot;

		let loadPromise = ()=>{
			return new Promise((resolve, reject)=>{
				const loadDependencies = ()=>{
					return new Promise((resolve, reject)=>{
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

						this.loadJS(document, libArray.concat(classesArray))
							.then(resolve)
							.catch(reject)
						;
					});
				};
				if(typeof browser === "object" && browser !== "null"){
					loadDependencies()
						.then(resolve)
						.catch(reject)
					;
				} else {
					this.loadJS(document, ["lib/browser-polyfill.min.js"])
						.then(()=>{
							resolve(loadDependencies());
						})
						.catch(reject)
					;
				}

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
			myMap.forEach((value, index, array) => {
				obj[index] = (value instanceof Map)? mapToObj(value) : value;
			});
			return obj;
		} else {
			throw 'myMap should be an Map';
		}
	}
}


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