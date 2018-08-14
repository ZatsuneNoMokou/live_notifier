class DropboxController {
	/**
	 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/identity/launchWebAuthFlow
	 * http://dropbox.github.io/dropbox-sdk-js/tutorial-JavaScript%20SDK.html
	 */

	constructor(clientId, authToken=''){
		this.client = null;

		this.clientId = clientId;
		this.authToken = authToken;
		this.fileName = 'livenotifier.json';
		this.API_ERROR_STATUS_FILE_NOT_FOUND = 409;
		this.HTTP_STATUS_CANCEL = 499;
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
	 * @return {Promise<String>}
	 */
	async getAuthToken(){
		if(this.authToken!==''){
			return this.authToken;
		}

		if(this.clientId===''){
			return 'InvalidClientId';
		}

		const client = new Dropbox.Dropbox({"clientId": this.clientId}),
			authUrl = client.getAuthenticationUrl(browser.identity.getRedirectURL())
		;

		let urlReturned = null,
			error
		;

		try{
			urlReturned = await DropboxController.identityLaunchWebAuthFlow({url: authUrl, interactive: true});
		} catch (e) {
			error = e;
		}

		if(urlReturned!==null){
			const params = new URLSearchParams(new URL(urlReturned).hash.replace('#', '?'));

			console.warn(urlReturned);

			this.authToken = params.get('access_token');

			return this.authToken;
		} else {
			if(error!==undefined){
				consoleMsg('error', error);
			}

			throw 'ErrorUnknown';
		}
	}

	/**
	 *
	 * @return {null|Dropbox.Dropbox}
	 */
	getClient(){
		if(this.client!==null){
			return this.client;
		} else if(this.clientId!=='' && this.authToken!==''){
			return this.client = new Dropbox.Dropbox({
				clientId: this.clientId,
				accessToken: this.authToken
			});
		} else {
			throw 'MissingInfo';
		}
	}

	/**
	 *
	 * @return {Promise<JSON>}
	 */
	async get() {
		const client = this.getClient();

		let data = null,
			error
		;

		try{
			data = await client.filesDownload({'path': '/' + this.fileName});
		} catch (e) {
			error = e;
		}

		if(data!==null){
			try{
				data = JSON.parse(await zDK.loadBlob(data.fileBlob, 'text'));
			} catch (e) {
				consoleMsg('error', e);
			}

			return data;
		} else {
			/* no file */
			if(error.status === this.API_ERROR_STATUS_FILE_NOT_FOUND){
				consoleMsg('warn', 'NoFile');
				return null;
			} else if(error!==undefined){
				consoleMsg('error', error);
				return null;
			}
		}
	}

	/**
	 *
	 * @param {JSON} jsonObject
	 * @return {Promise<boolean>}
	 */
	async set(jsonObject) {
		const client = this.getClient();

		let data = null,
			error
		;

		try{
			data = await client.filesUpload({'path': '/' + this.fileName, 'contents': JSON.stringify(jsonObject)});
		} catch (e) {
			error = e;
		}

		if(data !== null){
			consoleMsg('info', data);
			return true;
		} else {
			/* user cancelled the flow */
			if (error.status === this.HTTP_STATUS_CANCEL) {
				consoleMsg('error', 'UserCancelled');
				return false;
			} else {
				consoleMsg('error', error);
				return false;
			}
		}
	}
}
