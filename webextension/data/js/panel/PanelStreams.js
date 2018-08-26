let lazyLoading = null;

class PanelStreams extends Map {
	constructor(group_streams_by_websites, show_offline_in_panel) {
		super();

		/**
		 * @type Boolean
		 */
		this.group_streams_by_websites = group_streams_by_websites;

		/**
		 * @type Boolean
		 */
		this.show_offline_in_panel = show_offline_in_panel;
	}





	init() {
		/*if (lazyLoading === null) {
			lazyLoading = new LazyLoading();
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

		document.querySelector("#noErrorToShow").classList.remove("hide");
		removeAllChildren(document.querySelector("#debugData"));

		document.querySelector("#streamListOffline").classList.toggle("hide", !this.show_offline_in_panel);
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
	 * @param {JSON, Array<JSON>} data StreamRenderData or Array of it
	 * @return {Object}
	 */
	set(website, id, data) {
		if (super.has(website) === false) {
			super.set(website, new Map());
		}

		this.delete(website, id);

		let output;
		if (Array.isArray(data) === true) {
			output = [];

			data.forEach(value => {
				output.push(this.insertRenderData(value));
			})
		} else {
			output = this.insertRenderData(data);
		}

		// lazyLoading.updateStore();

		return super.get(website).set(id, output);
	}

	/**
	 *
	 * @param {String} website
	 * @param {String} id
	 */
	delete(website, id){
		if (this.has(website, id) === true) {
			this.get(website, id).forEach(item => {
				const array = Array.isArray(item) === true? item : [item];
				array.forEach(nodeList => {
					if (nodeList !== null && Array.isArray(nodeList)) {
						nodeList.forEach(node => {
							node.remove();
						})
					}
				});
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
	 * @param {String} contentId
	 * @param {String} type
	 * @param {JSON} streamSettings
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
			"withError": false,
			"streamName": streamData.streamName,
			"streamNameLowercase": streamData.streamName.toLowerCase(),
			"streamWebsite": website,
			"streamWebsiteLowercase": website.toLowerCase(),
			//"streamUrl": streamUrl,
			"streamType": type,
			"unsupportedType": (type === "unsupported"),
			"streamSettings": JSON.stringify(streamSettings),

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

		//let streamUrl = (type == "live" || type == "channel")? getStreamURL(website, id, contentId, true) : "";
		const websiteStreamURL = getStreamURL(website, id, contentId, false);
		if(websiteStreamURL !== "" && websiteStreamURL !== null){
			streamRenderData.streamURL = websiteStreamURL;
		}

		if(typeof streamData.facebookID === "string" && streamData.facebookID !== ""){
			streamRenderData.facebookId = streamData.facebookID;
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

		if(typeof liveStatus.lastCheckStatus === "string" && liveStatus.lastCheckStatus !== "" && liveStatus.lastCheckStatus !== "success"){
			streamRenderData.withError = true;


			let debugDataNode = document.querySelector("#debugData");
			let newDebugItem = document.createElement('div');
			newDebugItem.classList.add("debugItem");
			newDebugItem.dataset.streamWebsite = website;

			let newDebugItem_title = document.createElement('span');
			newDebugItem_title.classList.add("debugTitle");
			newDebugItem_title.textContent = streamData.streamName;
			newDebugItem.appendChild(newDebugItem_title);

			let newDebugItem_status = document.createElement('span');
			newDebugItem_status.textContent = `${liveStatus.lastCheckStatus}`;
			newDebugItem.appendChild(newDebugItem_status);

			debugDataNode.appendChild(newDebugItem);

			let noErrorToShow = document.querySelector("#noErrorToShow");
			hideClassNode(noErrorToShow);

			scrollbar_update("debugSection");
		}

		return streamRenderData;

		/*if(streamRenderData.usePictureLazyLoading===false && typeof streamRenderData.streamLogo==="string" && streamRenderData.streamLogo!==""){
			const streamPicture = $newNode[0].querySelector(".streamPicture");
			LazyLoading.loadImg(streamPicture, streamRenderData.streamLogo);
		}*/
	}

	/**
	 *
	 * @param {JSON} streamRenderData
	 * @return {null | Array<HTMLElement>}
	 */
	insertRenderData(streamRenderData){
		document.body.classList.toggle("groupedStreams", this.group_streams_by_websites);

		const html = Mustache.render(streamTemplate, streamRenderData);

		if(this.group_streams_by_websites){
			const website = streamRenderData.streamWebsite,
				selector = `#streamList${((streamRenderData.online)? "Online" : "Offline")} .${(websites.has(website))? website : "unsupported"}`
			;
			return backgroundPage.zDK.appendTo(selector, html, document);
		} else {
			let statusNode = document.querySelector(`#streamList${(streamRenderData.online)? "Online" : "Offline"}`),
				statusStreamList = statusNode.querySelectorAll(".item-stream")
			;

			if(statusStreamList.length > 0){
				for(let streamNode of statusStreamList){
					if(typeof streamNode.tagName === "string"){
						let streamNode_title = streamNode.dataset.streamName;
						if(streamRenderData.streamName.toLowerCase() < streamNode_title.toLowerCase()){
							return insertBefore(streamNode, html);
						}
					}
				}
			}
			return backgroundPage.zDK.appendTo(statusNode, html, document);
		}
	}
}