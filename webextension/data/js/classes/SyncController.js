class SyncController {
	/**
	 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/identity/launchWebAuthFlow
	 */
	constructor(fileName, clientId, authToken=''){
		this.client = null;

		this._clientId = clientId;
		this._authToken = authToken;
		this.fileName = fileName;
	}



	/**
	 *
	 * @param {String} clientId
	 * @param {String} authToken
	 * @param {SyncController} oldController
	 * @return {SyncController | null}
	 */
	static updateController(clientId, authToken, oldController=null){
		throw new Error('must be implemented by subclass!');
	};



	/**
	 *
	 * @return {String}
	 */
	get clientId() {
		return this._clientId;
	}
	/**
	 *
	 * @param {String} authToken
	 */
	set clientId(authToken) {
		this.client = null;
		this._authToken = authToken;
	}

	/**
	 *
	 * @return {String}
	 */
	get authToken() {
		return this._authToken;
	}
	/**
	 *
	 * @param {String} authToken
	 */
	set authToken(authToken) {
		this.client = null;
		this._authToken = authToken;
	}



	/**
	 *
	 * @param {Object} details
	 * @return {Promise<String>}
	 */
	static identityLaunchWebAuthFlow(details){
		return new Promise((resolve, reject) => {
			chrome.identity.launchWebAuthFlow(details, function (responseUrl) {
				if(typeof responseUrl!=="string" && responseUrl===undefined){
					reject();
				} else{
					resolve(responseUrl);
				}
			})
		})
	}

	/**
	 *
	 * @abstract
	 * @return {Promise<String>}
	 */
	async getAuthToken(){
		throw new Error('must be implemented by subclass!');
	}

	/**
	 *
	 * @abstract
	 * @return {Promise<boolean>}
	 */
	async revokeAuthToken(){
		throw new Error('must be implemented by subclass!');
	}

	/**
	 *
	 * @abstract
	 * @return {*}
	 */
	getClient(){
		throw new Error('must be implemented by subclass!');
	}

	/**
	 *
	 * @abstract
	 * @return {Promise<JSON>}
	 */
	async get() {
		throw new Error('must be implemented by subclass!');
	}

	/**
	 *
	 * @abstract
	 * @param {JSON} jsonObject
	 * @return {Promise<*>}
	 */
	async set(jsonObject) {
		throw new Error('must be implemented by subclass!');
	}
}
