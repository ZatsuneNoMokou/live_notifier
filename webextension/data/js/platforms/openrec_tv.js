const openrec_tv = {
	"title": "OpenRec.Tv",
	"website_ignore": "ignore",

	"addStream_URLpatterns": new Map([
		["openrec_tv", [
			/(?:http|https):\/\/www\.?openrec\.tv\/live\/([^\/?&#]+)*.*/
		]],
		["channel::openrec_tv", [
			/(?:http|https):\/\/www\.?openrec\.tv\/user\/([^\/?&#]+)*.*/
		]]
	]),



	"enabled": true,



	"Request_documentParseToJSON_getChannelId":
		function(xhrResponse){
			const responseDoc = xhrResponse.response;

			let jsonDATA = null;

			if(responseDoc){
				jsonDATA = {};

				const channelLink = responseDoc.querySelector(".p-playbox__content__info__userframe__user a[href^='https://www.openrec.tv/user/']"),
					streamOnline = responseDoc.querySelector(".p-playbox__content__info__frame__live"),
					streamName = responseDoc.querySelector(".p-playbox__content__info__title"),
					streamImg = responseDoc.querySelector("meta[property='og:image']")
				;

				jsonDATA.online = streamOnline!==null;

				if(streamName!==null){
					jsonDATA.streamName = streamName.textContent.trim();
				}

				if(streamImg!==null){
					jsonDATA.streamOwnerLogo = streamImg.content;
				}

				if(channelLink!==null){
					jsonDATA.channelLink = channelLink.href;
					jsonDATA.channelName = channelLink.textContent.trim();
				}
			}
			return jsonDATA;
		},

	"Request_documentParseToJSON_getLives":
		function(xhrResponse){
			const responseDoc = xhrResponse.response;

			let jsonDATA = null;

			if(responseDoc){
				jsonDATA = {
					"channelInfos": {},
					"items": {}
				};

				const livesList = responseDoc.querySelectorAll(".c-content .c-content__title ~ ul.c-content__list > li");

				if(livesList!==null){
					for(let liveItem of livesList){
						const thumbnail = liveItem.querySelector(".c-thumbnailVideo__box img"),
							title = liveItem.querySelector("a.c-thumbnailVideo__title"),
							game = liveItem.querySelector(".c-thumbnailVideo__game"),
							viewer = liveItem.querySelector(".c-thumbnailVideo__footer__liveCount"),
							itemData = {}
						;
						let contentId;

						if(thumbnail!==null){
							itemData.streamOwnerLogo = thumbnail.src;
						}

						if(title!==null){
							itemData.streamName = title.textContent.trim();
							itemData.streamURL = title.href;

							contentId = openrec_tv.addStream_URLpatterns.get("openrec_tv")[0].exec(itemData.streamURL)[1];
						}

						if(game!==null){
							itemData.streamGame = game.textContent.trim();
						}

						if(viewer!==null){
							const viewerReg = /(\d+,?\d+)/,
								viewerCount = viewerReg.exec(viewer.textContent)
							;

							if(viewerCount!==null){
								itemData.streamCurrentViewers = parseInt(viewerCount[1].replace(",", ""));
							}
						}

						if(contentId!==""){
							itemData.liveStatus = {
								API_Status: true
							};
							jsonDATA.items[contentId] = itemData;
						}
					}
				}

				const channelName = responseDoc.querySelector(".c-global__user__profile__list__name__text"),
					channelImg = responseDoc.querySelector(".c-global__user__profile__list__img img")
				;

				if(channelName!==null){
					jsonDATA.channelInfos.streamName = channelName.textContent.trim();
				}

				if(channelImg!==null){
					jsonDATA.channelInfos.streamOwnerLogo = channelImg.src;
				}
			}
			return jsonDATA;
		},



	"API_addStream":
		function(source_website, id){
			let obj = {
				"overrideMimeType": "text/html; charset=utf-8",
				"contentType": "document"
			};

			if(source_website === "openrec_tv"){
				obj.Request_documentParseToJSON = openrec_tv.Request_documentParseToJSON_getChannelId;
				obj.url = `https://www.openrec.tv/live/${id}`;
			} else {
				obj.Request_documentParseToJSON = openrec_tv.Request_documentParseToJSON_getLives;
				obj.url = `https://www.openrec.tv/user/${id}`;
			}

			return obj;
		},

	"API":
		function(id, nextPageToken){
			let obj = {
				"overrideMimeType": "text/html; charset=utf-8",
				"contentType": "document"
			};

			if(website_channel_id.test(id)){
				obj.url = `https://www.openrec.tv/user/${website_channel_id.exec(id)[1]}`;
				obj.Request_documentParseToJSON = openrec_tv.Request_documentParseToJSON_getLives;
			} else {
				obj.url = `https://www.openrec.tv/live/${id}`;
				obj.Request_documentParseToJSON = openrec_tv.Request_documentParseToJSON_getChannelId;
			}

			return obj;
		},



	"checkResponseValidity":
		function(data){
			if(typeof data !== "object" || data===null){
				return "error";
			} else {
				return "success";
			}
		},



	"addStream_getId":
		function(source_website, id, xhrResponse, streamListSetting, responseValidity){
			if(responseValidity === "success"){
				const json = xhrResponse.json;

				if(source_website === "openrec_tv"){
					const extr = openrec_tv.addStream_URLpatterns.get("channel::openrec_tv")[0].exec(json.channelLink);

					if(extr!==null){
						return {
							streamId: `channel::${extr[1]}`,
							streamName: json.channelName
						}
					}
				} else {
					return {
						streamId: `channel::${id}`,
						streamName: json.channelInfos.streamName
					}
				}
			}
		},

	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus, currentChannelInfo){
			let streamData = currentLiveStatus;

			for(let name in data){
				if(data.hasOwnProperty(name) && typeof data!=="object"){
					streamData[name] = data[name];
				}
			}

			return streamData;
		},
	"channelList":
		function(id, website, data, pageNumber){
			let obj = {
				streamList: new Map()
			};


			if(data.hasOwnProperty("channelInfos")){
				obj.channelInfos = data.channelInfos;
			}


			let list = data.items;

			for(let contentId in list){
				if(list.hasOwnProperty(contentId)){
					obj.streamList.set(contentId, list[contentId]);
				}
			}

			return obj;
		},
};
websites.set("openrec_tv", openrec_tv);