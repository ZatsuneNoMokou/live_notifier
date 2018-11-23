const DropboxController_FILENAME = 'livenotifier.json';

class DropboxController extends SyncController {
	/**
	 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/identity/launchWebAuthFlow
	 * http://dropbox.github.io/dropbox-sdk-js/tutorial-JavaScript%20SDK.html
	 */

	constructor(fileName, clientId, authToken=''){
		if (fileName === null || fileName === '') {
			fileName = DropboxController_FILENAME;
		}
		if (clientId === '') {
			clientId = DropboxController.d('NG93bWQyNG93bnZhZXc4');
		}
		super(fileName, clientId, authToken);



		this.API_ERROR_STATUS_FILE_NOT_FOUND = 409;
		this.HTTP_STATUS_CANCEL = 499;
	}



	/**
	 *
	 * @param {String} clientId
	 * @param {String} authToken
	 * @param {DropboxController} oldController
	 * @return {?DropboxController}
	 */
	static updateController(clientId, authToken, oldController=null){
		if (oldController !== null) {
			oldController.clientId = clientId;
			oldController.authToken = authToken;
		} else if (authToken !== '') {
			oldController = new DropboxController(null, clientId, authToken);
		} else {
			oldController = null;
		}

		return oldController;
	};



	/*
	 * https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
	 */
	static e(str) {
		return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
			function toSolidBytes(match, p1) {
				return String.fromCharCode('0x' + p1);
			}));
	}
	static d(str) {
		return decodeURIComponent(atob(str).split('').map(function(c) {
			return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
		}).join(''));
	}



	/**
	 *
	 * @override
	 * @return {?DropboxTypes.Dropbox}
	 */
	getClient(){
		if (this.client !== null) {
			return this.client;
		} else if (this.clientId !== '' && this.authToken !== '') {
			return this.client = new Dropbox.Dropbox({
				clientId: this.clientId,
				accessToken: DropboxController.d(this.authToken)
			});
		} else {
			throw 'MissingInfo';
		}
	}

	/**
	 *
	 * @override
	 * @return {Promise<String>}
	 */
	async getAuthToken(){
		if (this.authToken !== '') {
			return this.authToken;
		}

		if (this.clientId === '') {
			throw 'InvalidClientId';
		}

		/**
		 *
		 * @type {DropboxTypes.Dropbox}
		 */
		const client = new Dropbox.Dropbox({"clientId": this.clientId});

		let urlReturned = null,
			error
		;

		try{
			const authUrl = client.getAuthenticationUrl(browser.identity.getRedirectURL());

			// console.warn(browser.identity.getRedirectURL());

			urlReturned = await DropboxController.identityLaunchWebAuthFlow({url: authUrl, interactive: true});
		} catch (e) {
			error = e;
		}

		if (urlReturned !== null) {
			const params = new URLSearchParams(new URL(urlReturned).hash.replace('#', '?'));

			// console.warn(urlReturned);

			this.authToken = DropboxController.e(params.get('access_token'));

			return this.authToken;
		} else {
			if (error !== undefined) {
				consoleMsg('error', error);
				throw 'Error';
			} else {
				throw 'ErrorUnknown';
			}
		}
	}

	/**
	 *
	 * @return {Promise<?boolean>}
	 */
	async revokeAuthToken() {
		const client = this.getClient();

		if (client === null) {
			return false;
		}

		let result = false;
		try {
			await client.authTokenRevoke();
			result = true;
		} catch (e) {
			console.error(e);
		}

		return result;
	}





	/**
	 *
	 * @override
	 * @return {Promise<JSON>}
	 */
	async get() {
		const client = this.getClient();

		let metaData = null,
			data = null,
			error
		;

		try{
			metaData = await client.filesDownload({'path': '/' + this.fileName});
		} catch (e) {
			error = e;
		}

		if (metaData !== null) {
			try{
				data = JSON.parse(await zDK.loadBlob(metaData.fileBlob, 'text'));
			} catch (e) {
				consoleMsg('error', e);
				throw 'InvalidJson';
			}

			return {
				'data': data,
				'metadata': metaData
			};
		} else {
			if (error.status === this.API_ERROR_STATUS_FILE_NOT_FOUND) {
				throw 'NoFile';
			} else if(error!==undefined){
				throw error;
			}
		}
	}

	/**
	 *
	 * @return {Promise<Dropbox.files.FileMetadataReference>}
	 */
	async getMeta(){
		const client = this.getClient();

		let data = null,
			error
		;

		try{
			data = await client.filesGetMetadata({'path': '/' + this.fileName})
		} catch (e) {
			error = e;
		}

		if (data !== null && error === undefined) {
			return data;
		} else {
			if(error.status === this.API_ERROR_STATUS_FILE_NOT_FOUND){
				throw 'NoFile';
			} else if(error!==undefined){
				throw error;
			}
		}
	}

	/**
	 *
	 * @override
	 * @param {JSON} jsonObject
	 * @return {Promise<Dropbox.files.FileMetadata | boolean>}
	 */
	async set(jsonObject) {
		const client = this.getClient();

		let data = null,
			error
		;

		try{
			data = await client.filesUpload({
				'path': '/' + this.fileName,
				'contents': JSON.stringify(jsonObject),
				'mode': {
					'.tag': 'overwrite'
				},
				'mute': true
			});
		} catch (e) {
			error = e;
		}

		if(data !== null){
			return data;
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
