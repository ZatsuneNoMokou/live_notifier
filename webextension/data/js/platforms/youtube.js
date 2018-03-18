const youtube = {
	"title": "YouTube",
	"addStream_URLpatterns": new Map([
		["channel::youtube", [
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtube\.com\/channel\/([^\/?&#]+)*.*/
		]],
		["user::youtube", [
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtube\.com\/user\/([^\/?&#]+)*.*/
		]],
		["video::youtube", [
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtube\.com\/watch\?v=([^\/?&#]+)*.*/,
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtu\.be\/([^\/?&#]+)*.*/
		]],
		["c::youtube", [
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtube\.com\/c\/([^\/?&#]+)*.*/
		]]
	]),
	"Request_documentParseToJSON":
		function(xhrResponse){
			const responseDoc = xhrResponse.response,
				itempropNodes = responseDoc.querySelectorAll("#watch7-content > [itemprop], body > [itemprop], head > [itemprop]");
			let jsonDATA = null;
			
			if(itempropNodes !== null){
				jsonDATA = {};
				
				const getPropValue = function(node){
					let id = node.getAttribute("itemprop");
					switch(node.tagName.toLowerCase()){
						case "meta":
							return node.getAttribute("content");
							break;
						case "link":
							let link = node.getAttribute("href");
							if(link.indexOf("//") === 0){
								link = `https:${link}`;
							}
							return link;
							break;
						case "span":
							const content = {},
								subItemProps = node.querySelectorAll("[itemprop]");
							
							for(let subNode of subItemProps){
								const subNodeId = subNode.getAttribute("itemprop");
								content[subNodeId] = getPropValue(subNode);
							}
							
							if(id === "author" && content.hasOwnProperty("url")){
								return content.url;
							} else {
								return content;
							}
							break;
						default:
							console.group();
							console.warn(node.tagName.toLowerCase());
							console.dir(node);
							console.groupEnd();
					}
				};
				
				for(let node of itempropNodes){
					const id = node.getAttribute("itemprop");
					let itemprop_data = getPropValue(node);
					if(jsonDATA.hasOwnProperty(id)){
						if(Array.isArray(jsonDATA[id])){
							jsonDATA[id].push(itemprop_data);
						} else {
							itemprop_data = [jsonDATA[id], itemprop_data];
						}
					}
					jsonDATA[id] = itemprop_data;
				}
			}
			return jsonDATA;
		},
	"API_addStream":
		function(source_website, id){
			const apiKey = getPreference("youtube_api_key").replace(/\s/,""),
				referrer = getPreference("youtube_api_referrer");
			
			let obj = {
				"overrideMimeType": "text/html; charset=utf-8",
				"contentType": "document",
				"Request_documentParseToJSON": youtube.Request_documentParseToJSON
			};
			if(source_website === "c::youtube"){
				obj.url = `https://www.youtube.com/c/${id}`;
			} else if(source_website === "user::youtube"){
				obj.url = `https://www.youtube.com/user/${id}`;
			} else if(source_website === "video::youtube"){
				return youtube.API(id);
				/*obj.url = "https://www.youtube.com/watch";
				obj.content = [
					["v", id]
				]*/
			} else if(website_channel_id.test(source_website) === true){
				return youtube.API_channelInfos(`channel::${id}`);
			}
			return obj;
		},
	"API":
		function(id, nextPageToken){
			const apiKey = getPreference("youtube_api_key").replace(/\s/,""),
				referrer = getPreference("youtube_api_referrer"),
				youtube_patreon_password = getPreference("youtube_patreon_password").replace(/\s/,"")
			;

			let obj = {};
			
			if(typeof apiKey === "string" && apiKey !== ""){
				if(website_channel_id.test(id)){
					obj = {
						"url": "https://www.googleapis.com/youtube/v3/search",
						"overrideMimeType": "text/plain; charset=utf-8",
						"content": [
							["eventType", "live"],
							["part", "id"],
							["channelId", website_channel_id.exec(id)[1]],
							["type", "video"],
							["fields", "items(id),nextPageToken"],
							["key", apiKey]
						]
					};
					if(typeof nextPageToken === "string"){obj.content.push(["pageToken", nextPageToken]);}
				} else {
					obj = {
						"url": "https://www.googleapis.com/youtube/v3/videos",
						"overrideMimeType": "text/plain; charset=utf-8",
						"content": [
							["part", "id,liveStreamingDetails,snippet"],
							["id", id],
							["type", "video"],
							["fields", "items(id,liveStreamingDetails,snippet)"],
							["key", apiKey]
						]
					}
				}
				if(typeof referrer === "string" && referrer !== ""){
					obj.headers = {
						"referrer": referrer
					}
				}
			} else {
				if(website_channel_id.test(id)){
					obj = {
						"url": "https://livenotifier.zatsunenomokou.eu/youtube_getLives.php",
						"overrideMimeType":"text/plain; charset=utf-8",
						"content": [
							["id", website_channel_id.exec(id)[1]]
						]
					};
					if(youtube_patreon_password !== ""){
						obj.content.push(["password", youtube_patreon_password]);
					} else {
						if(typeof nextPageToken === "string"){
							obj.content.push(["pageToken", nextPageToken]);
						}
					}
				} else {
					obj = {
						"url": "https://livenotifier.zatsunenomokou.eu/youtube_getLiveInfo.php",
						"overrideMimeType": "text/plain; charset=utf-8",
						"content": [
							["id", id]
						]
					}
				}
			}
			return obj;
		},
	"API_channelInfos":
		function(id){
			const apiKey = getPreference("youtube_api_key").replace(/\s/,""),
				referrer = getPreference("youtube_api_referrer");
			
			let obj = {};
			
			if(typeof apiKey === "string" && apiKey !== ""){
				obj = {
					"url": "https://www.googleapis.com/youtube/v3/channels",
					"overrideMimeType": "text/plain; charset=utf-8",
					"content": [
						["part", "snippet"],
						["id", website_channel_id.exec(id)[1]],
						["fields", "items(id,snippet)"],
						["key", apiKey]
					]
				};
				if(typeof referrer === "string" && referrer !== ""){
					obj.headers = {
						"referrer": referrer
					}
				}
			} else {
				obj = {
					"url": "https://livenotifier.zatsunenomokou.eu/youtube_getChannel.php",
					"overrideMimeType": "text/plain; charset=utf-8",
					"content": [
						["id", website_channel_id.exec(id)[1]]
					]
				}
			}
			return obj;
		},
	"importAPI": function(id){
		return {
			"url": "https://www.youtube.com/subscription_manager?action_takeout=1",
			//"overrideMimeType": "application/xml; charset=utf-8",
			"overrideMimeType": "text/html; charset=utf-8",
			"contentType": "document",
			"Request_documentParseToJSON": function(xhrRequest){
				let userChannelList = {"list": null};
				const getId = /https\:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id\=([^&]+)/i,
					dataDocument = xhrRequest.response;
				if(dataDocument.querySelector("outline") !== null){
					userChannelList.list = [];
					let userChannelList_nodes = xhrRequest.response.querySelectorAll("outline[xmlUrl]");
					for(let node of userChannelList_nodes){
						if(getId.test(node.getAttribute("xmlurl"))){
							userChannelList.list.push(`channel::${getId.exec(node.getAttribute("xmlurl"))[1]}`);
						}
					}
				}
				return userChannelList;
			}
		};
	},
	"checkResponseValidity":
		function(data){
			if(data.hasOwnProperty("error") === true && typeof data.error === "object"){
				if(data.error.hasOwnProperty("message") === true && typeof data.error.message === "string"){
					return data.error.message;
				} else {
					return "error";
				}
			} else {
				return "success";
			}
		},
	"addStream_getId":
		function(source_website, id, xhrResponse, streamListSetting, responseValidity){
			const data = xhrResponse.json;
			if(responseValidity === "success"){
				if(data.hasOwnProperty("items") === true && typeof data.items.length === "number" && data.items.length === 1){
					
					if(data.items[0].hasOwnProperty("snippet") === true && data.items[0].snippet.hasOwnProperty("channelId") === true){
						return {
							streamId: `channel::${data.items[0].snippet.channelId}`,
							streamName: (typeof data.items[0].snippet.channelTitle === "string")? data.items[0].snippet.channelTitle : data.items[0].snippet.channelId
						};
					} else if(data.items[0].hasOwnProperty("id") === true && typeof data.items[0].id === "string"){
						return {
							streamId: `channel::${data.items[0].id}`,
							streamName: (data.items[0].snippet && typeof data.items[0].snippet.title === "string")? data.items[0].snippet.title : data.items[0].id
						};
					}
				} else if(data.hasOwnProperty("channelId")){
					const dataDocument = xhrResponse.response;
					
					const channelIdPropItem = dataDocument.querySelector("meta[itemprop=channelId]");
					if(channelIdPropItem !== null && typeof channelIdPropItem.hasAttribute("content")){
						const channelNamePropItem = dataDocument.querySelector("meta[itemprop=name]");
						return {
							streamId: `channel::${channelIdPropItem.getAttribute("content")}`,
							streamName: (channelNamePropItem !== null && typeof channelNamePropItem.hasAttribute("content"))? channelNamePropItem.getAttribute("content") : channelIdPropItem.getAttribute("content")
						};
					}// else {
						//let linkNode = dataDocument.querySelector("#content .qualified-channel-title a");
						//if(typeof linkNode.tagName == "string"){
							//let linkResult = linkNode.outerHTML.match(/href=\"([^\"]+)\"/);
							//if(linkResult != null && typeof linkResult[1] == "string"){
								//let obj = {"url": `https:\/\/www.youtube.com${(/^\/.*/.test(linkResult[1]))? "" : "/"}${linkResult[1]}`};
								//return obj;
							//}
						//}
						//return null;
					//}
				}
			}
			return null;
		},
	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus, currentChannelInfo){
			let streamData = currentLiveStatus;
			
			/*if(data.hasOwnProperty("channelId")){
				if(typeof data.name == "string" && data.url != ""){
					streamData.streamName = data.name;
				}
				if(typeof currentChannelInfo == "object" && currentChannelInfo != null && typeof currentChannelInfo.streamName == "string"){
					streamData.streamStatus = streamData.streamName;
					streamData.streamName = currentChannelInfo.streamName;
				}
				
				if(data.hasOwnProperty("thumbnailUrl") && typeof data.thumbnailUrl == "string" && data.thumbnailUrl != ""){
					streamData.streamOwnerLogo = data.thumbnailUrl;
				} else if(data.hasOwnProperty("thumbnail") && data.hasOwnProperty("url") && typeof data.thumbnail.url == "string" && data.thumbnail.url != ""){
					streamData.streamOwnerLogo = data.thumbnail.url;
				}
				
				if(data.hasOwnProperty("url") && typeof data.url == "string" && data.url.indexOf("youtube.com/") != -1){
					streamData.streamURL = data.url;
				}
				
				if(data.hasOwnProperty("duration")){
					let zeroSecDurationReg = /^PT(?:0H)?(?:0M)?(?:0S)?$/i;
					streamData.liveStatus.API_Status = (zeroSecDurationReg.test(data.duration));
				} else {
					streamData.liveStatus.API_Status = false;
				}
				return streamData;
			} else */ if(data.hasOwnProperty("items") === true && typeof data.items.length === "number" && data.items.length == 1){
				streamData.streamURL = "https://www.youtube.com/watch?v=" + contentId;
				
				data = data.items[0];
				snippetData = data.snippet;
				
				if(typeof snippetData.title === "string" && snippetData.title !== ""){
					streamData.streamName = snippetData.title;
				}
				/*if(typeof snippetData.description == "string" && snippetData.description != ""){
					streamData.streamStatus = snippetData.description;
				}*/
				if(typeof currentChannelInfo === "object" && currentChannelInfo !== null && typeof currentChannelInfo.streamName === "string"){
					streamData.streamStatus = streamData.streamName;
					streamData.streamName = currentChannelInfo.streamName;
				}
				
				if(snippetData.hasOwnProperty("thumbnails") === true){
					if(snippetData.thumbnails.hasOwnProperty("high") === true && snippetData.thumbnails.high.hasOwnProperty("url") === true && typeof snippetData.thumbnails.high.url === "string"){
						streamData.streamOwnerLogo = snippetData.thumbnails.high.url;
					} else if(snippetData.thumbnails.hasOwnProperty("default") === true && snippetData.thumbnails["default"].hasOwnProperty("url") === true && typeof snippetData.thumbnails.high.url === "string"){
						streamData.streamOwnerLogo = snippetData.thumbnails["default"].url;
					}
				}
				
				streamData.streamCurrentViewers = "";
				if(data.hasOwnProperty("liveStreamingDetails") === true && data.liveStreamingDetails.hasOwnProperty("concurrentViewers") === true && typeof data.liveStreamingDetails.concurrentViewers !== "undefined"){
					switch(typeof data.liveStreamingDetails.concurrentViewers){
						case "string":
							streamData.streamCurrentViewers = parseInt(data.liveStreamingDetails.concurrentViewers);
							break;
						case "number":
							streamData.streamCurrentViewers = data.liveStreamingDetails.concurrentViewers;
							break;
					}
				}
				
				streamData.liveStatus.API_Status = true;
				return streamData;
			} else if(data.hasOwnProperty("streamOwnerLogo")){
				if(currentChannelInfo.streamName !== ""){
					streamData.streamName = currentChannelInfo.streamName;
					streamData.streamStatus = data.streamName;
				} else {
					streamData.streamName = data.streamName;
				}
				streamData.streamURL = (typeof data.streamURL === "string")? data.streamURL : ((typeof data.streamUrl === "string")? data.streamUrl : "");
				streamData.streamOwnerLogo = data.streamOwnerLogo;
				streamData.streamCurrentViewers = data.streamCurrentViewers;
				streamData.liveStatus.API_Status = true;
				return streamData;
			} else {
				return null;
			}
		},
	"channelList":
		function(id, website, data, pageNumber){
			let obj = {
				streamList: new Map()
			};
			
			if(data.hasOwnProperty("list") === true){
				let list = data.list;
				
				for(let contentId in list){
					if(list.hasOwnProperty(contentId)){
						obj.streamList.set(contentId, list[contentId]);
					}
				}
				obj.primaryRequest = false;
				
				return obj;
			} else if(data.hasOwnProperty('items') === false){
				return obj;
			} else {
				let list = data.items;
				
				for(let i in list){
					if(list.hasOwnProperty(i)){
						let contentId = list[i].id.videoId;
						obj.streamList.set(contentId, null);
					}
				}
				
				if(data.hasOwnProperty("nextPageToken") === true){
					obj.nextPageToken = data.nextPageToken;
				}
				return obj;
			}
		},
	"channelInfosProcess":
		function(id, data, currentChannelInfo){
			let streamData = currentChannelInfo;
			
			if(data.hasOwnProperty("channelId")){
				if(typeof data.name === "string" && data.url !== ""){
					streamData.streamName = data.name;
				}
				
				if(data.hasOwnProperty("thumbnailUrl") && typeof data.thumbnailUrl === "string" && data.thumbnailUrl !== ""){
					streamData.streamOwnerLogo = data.thumbnailUrl;
				} else if(data.hasOwnProperty("thumbnail") && data.hasOwnProperty("url") && typeof data.thumbnail.url === "string" && data.thumbnail.url !== ""){
					streamData.streamOwnerLogo = data.thumbnail.url;
				}
				
				let urlFound = false;
				if(data.hasOwnProperty("author")){
					if(Array.isArray(data.author)){
						for(let item of data.author){
							if(typeof item === "string" && item.indexOf("youtube.com/") !== -1){
								streamData.streamURL = item;
								urlFound = true;
								break;
							}
						}
					} else {
						if(typeof data.author === "string" && data.author.indexOf("youtube.com/") !== -1){
							streamData.streamURL = data.author;
							urlFound = true;
						}
					}
				} else if(!urlFound){
					if(data.hasOwnProperty("url") && typeof data.url === "string" && data.url.indexOf("youtube.com/") !== -1){
						streamData.streamURL = data.url;
					}
				}
			} else if(data.hasOwnProperty("items") === true && typeof data.items.length === "number" && data.items.length === 1){
				data = data.items[0].snippet;
				
				if(typeof data.title === "string" && data.title !== ""){
					streamData.streamName = data.title;
				}
				if(typeof data.customUrl === "string" && data.customUrl !== ""){
					streamData.streamURL = "http://www.youtube.com/c/" + data.customUrl;
				}
				
				if(data.hasOwnProperty("thumbnails") === true){
					if(data.thumbnails.hasOwnProperty("high") === true && data.thumbnails.high.hasOwnProperty("url") === true && typeof data.thumbnails.high.url === "string"){
						streamData.streamOwnerLogo = data.thumbnails.high.url;
					} else if(data.thumbnails.hasOwnProperty("default") === true && data.thumbnails["default"].hasOwnProperty("url") === true && typeof data.thumbnails.high.url === "string"){
						streamData.streamOwnerLogo = data.thumbnails["default"].url;
					}
				}
			}
			return streamData;
		},
	"importStreamWebsites":
		function(id, data, streamListSetting, pageNumber){
			let obj = {
				list: null
			};
			if(data !== null && data.list !== null && Array.isArray(data.list)){
				obj.list = data.list;
			}
			return obj;
		}
};
websites.set("youtube", youtube);
