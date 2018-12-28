class PanelStreams extends Map {
	constructor(group_streams_by_websites, show_offline_in_panel) {
		super();

		/**
		 * @type Boolean
		 */
		this.group_streams_by_websites = (typeof group_streams_by_websites === "boolean")? group_streams_by_websites : false;

		/**
		 * @type Boolean
		 */
		this.show_offline_in_panel = (typeof show_offline_in_panel === "boolean")? show_offline_in_panel : false;

		// this.lazyLoading = null;
	}

	/**
	 * Static lazy getter to defined a static property
	 * @return {Map<String, Element | null>}
	 */
	static get cachedQuerySelectorMap(){
		delete PanelStreams.cachedQuerySelectorMap;
		return this.cachedQuerySelectorMap = new Map();
	}

	static cachedQuerySelector(selector){
		if (this.cachedQuerySelectorMap.has(selector) === false || this.cachedQuerySelectorMap.get(selector) === null || this.cachedQuerySelectorMap.get(selector).parentNode === null) {
			this.cachedQuerySelectorMap.set(selector, document.querySelector(selector));
		}

		return this.cachedQuerySelectorMap.get(selector);
	}

	static get $debugData(){
		return this.cachedQuerySelector("#debugData");
	}

	static get $debug_checkingLivesState(){
		return this.cachedQuerySelector("#debug_checkingLivesState");
	}

	static get $refreshStreams(){
		return this.cachedQuerySelector("#refreshStreams");
	}

	static get $noErrorToShow(){
		return this.cachedQuerySelector("#noErrorToShow");
	}

	static get $streamListOnline(){
		return this.cachedQuerySelector("#streamListOnline");
	}

	static get $streamListOffline(){
		return this.cachedQuerySelector("#streamListOffline");
	}





	init() {
		/*if (lazyLoading === null) {
			this.lazyLoading = new LazyLoading();
		}*/

		let streamItems = document.querySelectorAll(".item-stream");
		if(streamItems.length > 0){
			for(let i in streamItems){
				if(streamItems.hasOwnProperty(i)){
					let node = streamItems[i];
					if(typeof node.remove !== "undefined"){
						node.removeEventListener("click", streamItemClick);
						node.remove();
					}
				}
			}
		}

		PanelStreams.$noErrorToShow.classList.remove('hide');
		removeAllChildren(PanelStreams.$debugData);

		PanelStreams.$streamListOffline.classList.toggle('hide', !this.show_offline_in_panel);
	}



	/**
	 *
	 * @param {String} website
	 * @param {String} id
	 * @return {Boolean}
	 */
	has(website, id) {
		return super.has(website) && super.get(website).has(id);
	}

	/**
	 *
	 * @param {String} website
	 * @param {String} id
	 * @return {Object}
	 */
	get(website, id) {
		return super.get(website).get(id);
	}

	/**
	 *
	 * @param {String} website
	 * @param {String} id
	 * @param {Object=} streamSettings
	 * @return {Object | undefined}
	 */
	set(website, id, streamSettings=null) {
		if (super.has(website) === false) {
			super.set(website, new Map());
		}

		this.delete(website, id);

		let data = this.getStreamData(website, id, streamSettings),
			output
		;

		if (data !== null) {
			if (Array.isArray(data) === true) {
				output = [];

				data.forEach(value => {
					output.push(this.insertRenderData(value));
				})
			} else {
				output = this.insertRenderData(data);
			}

			// this.lazyLoading.updateStore();

			updateCounts();
			return super.get(website).set(id, output);
		} else {
			return undefined;
		}
	}

	/**
	 *
	 * @param {String} website
	 * @param {String} id
	 */
	delete(website, id){
		if (this.has(website, id) === true) {
			this.get(website, id).forEach((item) => {
				const array = Array.isArray(item) === true? item : [item];

				while(array.length > 0){
					const nodeList = array.shift();

					if (nodeList !== null){
						if (Array.isArray(nodeList)) {
							nodeList.forEach(node => {
								node.remove();
							});
						} else if (typeof nodeList.remove === "function") {
							nodeList.remove();
						}
					}
				}
			});
		}
	}

	clear() {
		this.init();

		super.clear();
	}





	/**
	 *
	 * @param {String} website
	 * @param {String} id
	 * @param {Object=} streamSettings
	 * @return {JSON}
	 */
	getStreamData(website, id, streamSettings=null) {
		if (streamSettings === null) {
			const streamListSettings = new StreamListFromSetting().mapDataAll;
			if (streamListSettings.has(website) && streamListSettings.get(website).has(id)) {
				streamSettings = streamListSettings.get(website).get(id);
			}
		}



		if (streamSettings === null) {
			return null;
		}



		let streamRenderData = null;

		const livesMap = liveStore.getLive(website, id);

		if(livesMap.size > 0){
			streamRenderData = [];
			livesMap.forEach((streamData, contentId) => {
				getCleanedStreamStatus(website, id, contentId, streamSettings, streamData.liveStatus.API_Status);

				if(streamData.liveStatus.filteredStatus || (this.show_offline_in_panel && !streamData.liveStatus.filteredStatus)){
					doStreamNotif(website, id, contentId, streamSettings, streamData.liveStatus.API_Status);

					streamRenderData.push(PanelStreams.streamToRenderData(website, id, contentId, "live", streamSettings, streamData));
				}
			});
		} else if (liveStore.hasChannel(website, id)) {
			//console.info(`Using channel infos for ${id} (${website})`);

			streamRenderData = PanelStreams.streamToRenderData(website, id, /* contentId */ id, "channel", streamSettings, liveStore.getChannel(website, id));
		} else if (websites.has(website)) {
			console.info(`Currrently no data for ${id} (${website})`);

			let contentId = id,
				streamData = {
					"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""},
					"streamName": contentId,
					"streamStatus": "",
					"streamGame": "",
					"streamOwnerLogo": "",
					"streamCategoryLogo": "",
					"streamCurrentViewers": null,
					"streamURL": "",
					"twitterID": ""
				},
				website_channel_id = appGlobal["website_channel_id"]
			;

			if (website_channel_id.test(streamData.streamName)) {
				streamData.streamName = website_channel_id.exec(streamData.streamName)[1];
			}

			streamRenderData = PanelStreams.streamToRenderData(website, id, contentId, website, streamSettings, streamData);
		} else {
			let contentId = id,
				streamData = {
					"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""},
					"streamName": contentId,
					"streamStatus": "",
					"streamGame": "",
					"streamOwnerLogo": "",
					"streamCategoryLogo": "",
					"streamCurrentViewers": null,
					"streamURL": "",
					"twitterID": ""
				}
			;

			console.warn(`The website of ${id} ("${website}") is not supported or not loaded`);

			streamRenderData = PanelStreams.streamToRenderData(website, id, contentId, "unsupported", streamSettings, streamData);
		}



		return streamRenderData;
	}

	/**
	 *
	 * @param {String} website
	 * @param {String} id
	 * @param {String} contentId
	 * @param {String} type
	 * @param {Object} streamSettings
	 * @param {JSON} streamData
	 * @return {{streamId: String, contentId: String, online: boolean, withError: boolean, streamName: String, streamNameLowercase: string, streamWebsite: String, streamWebsiteLowercase: string, streamType: String, unsupportedType: boolean, streamSettings: string, usePictureLazyLoading: boolean}}
	 */
	static streamToRenderData(website, id, contentId, type, streamSettings, streamData) {
		let online = false;
		switch(type){
			case "live":
				online = streamData.liveStatus.filteredStatus;
				break;
			case "channel":
				online = streamData.liveStatus.API_Status;
				break;
		}
		let liveStatus = streamData.liveStatus;

		let streamRenderData = {
			"streamId": id,
			"contentId": contentId,
			"online": online,
			"streamName": streamData.streamName,
			"streamNameLowercase": streamData.streamName.toLowerCase(),
			"streamWebsite": website,
			"streamWebsiteLowercase": website.toLowerCase(),
			//"streamUrl": streamUrl,
			"streamType": type,
			"unsupportedType": (type === "unsupported"),
			"streamSettings": JSON.stringify(streamSettings),

			"lastCheckStatus": (typeof liveStatus.lastCheckStatus === "string")? liveStatus.lastCheckStatus : "",
			"withError": (typeof liveStatus.lastCheckStatus === "string" && liveStatus.lastCheckStatus !== "" && liveStatus.lastCheckStatus !== "success"),

			"usePictureLazyLoading": true
		};

		if(online){
			streamRenderData.streamStatus = streamData.streamStatus;
			streamRenderData.streamStatusLowercase = streamData.streamStatus.toLowerCase();
			if(streamData.streamGame.length > 0){
				streamRenderData.streamGame = streamData.streamGame;
				streamRenderData.streamGameLowercase = streamData.streamGame.toLowerCase();
			}
			if(typeof streamData.streamCurrentViewers === "number"){
				let viewer_number = (typeof streamData.streamCurrentViewers === "number")? streamData.streamCurrentViewers : parseInt(streamData.streamCurrentViewers);
				streamRenderData.streamCurrentViewers = (viewer_number < 1000)? viewer_number : ((Math.round(viewer_number / 100)/10) + "k");
			}
		}

		const websiteStreamURL = getStreamURL(website, id, contentId);
		if(websiteStreamURL !== "" && websiteStreamURL !== null){
			streamRenderData.streamURL = websiteStreamURL;
		}

		if(typeof streamData.twitterID === "string" && streamData.twitterID !== ""){
			streamRenderData.twitterId = streamData.twitterID;
		}

		let streamLogo = "";
		if(online && typeof streamData.streamCategoryLogo === "string" && streamData.streamCategoryLogo !== ""){
			streamLogo  = streamData.streamCategoryLogo;
		} else if(typeof streamData.streamOwnerLogo === "string" && streamData.streamOwnerLogo !== ""){
			streamLogo  = streamData.streamOwnerLogo;
		}

		if(typeof streamLogo === "string" && streamLogo !== ""){
			streamRenderData.streamLogo = streamLogo;
		}
		// if(typeof backgroundPage.zDK.isFirefox==="boolean" && backgroundPage.zDK.isFirefox===false){
		streamRenderData.usePictureLazyLoading = false;
		// }

		return streamRenderData;

		/*if(streamRenderData.usePictureLazyLoading===false && typeof streamRenderData.streamLogo==="string" && streamRenderData.streamLogo!==""){
			const streamPicture = $newNode[0].querySelector(".streamPicture");
			this.LazyLoading.loadImg(streamPicture, streamRenderData.streamLogo);
		}*/
	}

	/**
	 *
	 * @param {JSON} streamRenderData
	 * @return {null | Array<Element>}
	 */
	insertRenderData(streamRenderData){
		document.body.classList.toggle("groupedStreams", this.group_streams_by_websites);

		const html = Mustache.render(streamTemplate, streamRenderData);

		let resultNodes = null;



		if(this.group_streams_by_websites){
			const website = streamRenderData.streamWebsite,
				selector = `#streamList${((streamRenderData.online)? "Online" : "Offline")} .${(websites.has(website))? website : "unsupported"}`
			;
			resultNodes = backgroundPage.zDK.appendTo(selector, html, document);
		} else {
			let statusNode = (streamRenderData.online)? PanelStreams.$streamListOnline : PanelStreams.$streamListOffline,
				statusStreamList = statusNode.querySelectorAll(".item-stream")
			;

			if(statusStreamList.length > 0){
				for(let streamNode of statusStreamList){
					if(typeof streamNode.tagName === "string"){
						let streamNode_title = streamNode.dataset.streamName;
						if(streamRenderData.streamName.toLowerCase() < streamNode_title.toLowerCase()){
							resultNodes = insertBefore(streamNode, html);
							break;
						}
					}
				}
			}

			if (resultNodes === null) {
				resultNodes = backgroundPage.zDK.appendTo(statusNode, html, document);
			}
		}

		updateStreamListScrollbar();



		if(streamRenderData.withError === true){
			let newDebugItem = document.createElement('div');
			newDebugItem.classList.add("debugItem");
			newDebugItem.dataset.streamWebsite = streamRenderData.streamWebsite;

			let newDebugItem_title = document.createElement('span');
			newDebugItem_title.classList.add("debugTitle");
			newDebugItem_title.textContent = streamRenderData.streamName;
			newDebugItem.appendChild(newDebugItem_title);

			let newDebugItem_status = document.createElement('span');
			newDebugItem_status.textContent = `${streamRenderData.lastCheckStatus}`;
			newDebugItem.appendChild(newDebugItem_status);



			PanelStreams.$debugData.appendChild(newDebugItem);
			resultNodes.push(newDebugItem);



			hideClassNode(PanelStreams.$noErrorToShow);

			scrollbar_update("debugSection");
		}



		return resultNodes;
	}
}



/**
 *
 * @type {Function}
 */
const updateCounts = _.debounce(function (){
	//Update online steam count in the panel
	let onlineCount = appGlobal["onlineCount"];

	PanelStreams.cachedQuerySelector("#streamOnlineCountLabel").textContent = (onlineCount === 0)? i18ex._("No_stream_online") :  i18ex._("count_stream_online", {count: onlineCount});





	//Update offline steam count in the panel
	let show_offline_in_panel = getPreference("show_offline_in_panel"),
		data = ""
	;

	if(show_offline_in_panel){
		let offlineCount = getOfflineCount();
		data = (offlineCount === 0)? i18ex._("No_stream_offline") :  i18ex._("count_stream_offline", {count: offlineCount});
	}

	PanelStreams.cachedQuerySelector("#streamOfflineCountLabel").textContent = data;
}, 100, {
	maxWait: 500
});

/**
 *
 * @type {Function}
 */
const updateStreamListScrollbar = _.debounce(function () {
	scrollbar_update("streamList");
}, 50, {
	maxWait: 200
});
