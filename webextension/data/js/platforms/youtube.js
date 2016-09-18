let youtube = {
	"title": "YouTube",
	"addStream_URLpatterns": new Map([
		["channel::youtube", [
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtube\.com\/channel\/([^\/\?\&\#]+)*.*/
		]],
		["user::youtube", [
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtube\.com\/user\/([^\/\?\&\#]+)*.*/
		]],
		["video::youtube", [
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtube\.com\/watch\?v\=([^\/\?\&\#]+)*.*/,
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtu\.be\/([^\/\?\&\#]+)*.*/
		]],
		["c::youtube", [
			/(?:http|https):\/\/(?:www\.|gaming\.)?youtube\.com\/c\/([^\/\?\&\#]+)*.*/
		]]
	]),
	"Request_documentParseToJSON":
		function(xhrResponse){
			let responseDoc = xhrResponse.response;
			
			let itempropNodes = responseDoc.querySelectorAll("#watch7-content > [itemprop], body > [itemprop], head > [itemprop]");
			let jsonDATA = null;
			
			if(itempropNodes != null){
				jsonDATA = {};
				// let parser = new DOMParser();
				
				let getPropValue = function(node){
					let id = node.getAttribute("itemprop");
					switch(node.tagName.toLowerCase()){
						case "meta":
							return node.getAttribute("content");
							break;
						case "link":
							let link = node.getAttribute("href");
							if(link.indexOf("//") == 0){
								link = `https:${link}`;
							}
							return link;
							break;
						case "span":
							let content = {};
							
							let subItemProps = $(node).find("[itemprop]");
							// let subNodesDoc = parser.parseFromString(node.innerHTML, "text/html");
							// let subItemProps = subNodesDoc.querySelectorAll("[itemprop]");
							
							for(let subNode of subItemProps){
								let subNodeId = subNode.getAttribute("itemprop");
								content[subNodeId] = getPropValue(subNode);
							}
							
							if(id == "author" && content.hasOwnProperty("url")){
								return content.url;
							} else {
								return content;
							}
							break;
						default:
							console.group()
							console.warn(node.tagName.toLowerCase());
							console.dir(node);
							console.groupEnd();
					}
				}
				
				for(let node of itempropNodes){
					let id = node.getAttribute("itemprop");
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
			let apiKey = getPreference("youtube_api_key"),
				referrer = getPreference("youtube_api_referrer"),
				youtube_patreon_password = getPreference("youtube_patreon_password").replace(/\s/,"");
			
			let obj = {
				"overrideMimeType": "text/html; charset=utf-8",
				"contentType": "document",
				"Request_documentParseToJSON": youtube.Request_documentParseToJSON
			}
			if(source_website == "c::youtube"){
				obj.url = `https://www.youtube.com/c/${id}`;
			} else if(source_website == "user::youtube"){
				obj.url = `https://www.youtube.com/user/${id}`;
			} else if(source_website == "video::youtube"){
				obj.url = "https://www.youtube.com/watch";
				obj.content = [
					["v", id]
				]
			} else if(website_channel_id.test(source_website) == true){
				return youtube.API_channelInfos(`channel::${id}`);
			}
			return obj;
		},
	"API":
		function(id, nextPageToken){
			let apiKey = getPreference("youtube_api_key"),
				referrer = getPreference("youtube_api_referrer"),
				youtube_patreon_password = getPreference("youtube_patreon_password").replace(/\s/,"");
			
			let obj = {};
			
			if(youtube_patreon_password != ""){
				if(website_channel_id.test(id)){
					obj = {
						"url": "https://livenotifier.zatsunenomokou.eu/youtube_getLives.php",
						"overrideMimeType":"text/plain; charset=utf-8",
						"content": [
							["id", website_channel_id.exec(id)[1]]
						]
					}
					if(typeof nextPageToken == "string"){obj.content.push(["pageToken", nextPageToken]);}
				} else {
					obj = {
						"url": "https://livenotifier.zatsunenomokou.eu/youtube_getLiveInfo.php",
						"overrideMimeType": "text/plain; charset=utf-8",
						"content": [
							["id", id],
							["password", youtube_patreon_password]
						]
					}
				}
			} else if(typeof apiKey == "string" && apiKey != ""){
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
					}
					if(typeof nextPageToken == "string"){obj.content.push(["pageToken", nextPageToken]);}
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
				if(typeof referrer == "string" && referrer != ""){
					obj.headers = {
						"referrer": referrer
					}
				}
			} else {
				if(website_channel_id.test(id)){
					/*obj = {
						"url": "https://livenotifier.zatsunenomokou.eu/youtube_getLives.php",
						"overrideMimeType": "text/plain; charset=utf-8",
						"content": [
							["id", website_channel_id.exec(id)[1]]
						]
					}*/
					obj = {
						"url": `https:\/\/www.youtube.com/channel/${website_channel_id.exec(id)[1]}/videos`,
						"overrideMimeType": "text/html; charset=utf-8",
						"content": [
							["view", "2"],
							["live_view", "501"]
						],
						"contentType": "document",
						"Request_documentParseToJSON": function(xhrRequest){
							let dataDocument = xhrRequest.response;
							//let parser = new DOMParser();
							
							let streamList_nodes = dataDocument.querySelectorAll("#channels-browse-content-grid li.channels-content-item");
							let streamListData_Map = new Map();
							streamListData_Map.set("list", new Map());
							
							for(let node of streamList_nodes){
								let currentChannelId = dataDocument.querySelector("meta[itemprop=channelId]").getAttribute("content");
								
								//let subNodeDoc = parser.parseFromString(node.innerHTML, "text/html");
								if($(node).find(".video-time").length == 0){
									let streamId_node = $(node).find("[data-context-item-id]");
									let ownerId = $(node).find("[data-ytid]");
									
									if((ownerId.length > 0 && ownerId[0].dataset.ytid == currentChannelId) && streamId_node.length > 0){
										let streamId = streamId_node[0].dataset.contextItemId;
										
										//let streamName_node = $(node).find(".yt-lockup-title");
										//let streamName = (streamName_node.length > 0)? streamName_node[0].textContent : "";
										
										let streamCurrentViewers_node = $(node).find(".yt-lockup-meta-info");
										if($(streamCurrentViewers_node).find(".localized-date").length > 0){/**		Programmed events		**/
											continue;
										}
										let streamCurrentViewers = (streamCurrentViewers_node.length > 0)? parseInt(streamCurrentViewers_node[0].textContent.replace(/\s/,"")) : null;
										
										streamListData_Map.get("list").set(streamId, {"streamCurrentViewers": streamCurrentViewers});
									}
								}
							}
							return streamListData_Map;
						}
					}
					if(typeof nextPageToken == "string"){obj.content.push(["pageToken", nextPageToken]);}
				} else {
					obj = {
						"url": "http://www.youtube.com/watch",
						"overrideMimeType": "text/html; charset=utf-8",
						"content": [
							["v", id]
						],
						"contentType": "document",
						"Request_documentParseToJSON": youtube.Request_documentParseToJSON
					}
				}
			}
			return obj;
		},
	"API_channelInfos":
		function(id){
			let apiKey = getPreference("youtube_api_key"),
				referrer = getPreference("youtube_api_referrer"),
				youtube_patreon_password = getPreference("youtube_patreon_password").replace(/\s/,"");
			
			let obj = {};
			
			if(youtube_patreon_password != ""){
				obj = {
					"url": "https://livenotifier.zatsunenomokou.eu/youtube_getChannel.php",
					"overrideMimeType": "text/plain; charset=utf-8",
					"content": [
						["id", website_channel_id.exec(id)[1]],
						["password", youtube_patreon_password]
					]
				}
			} else if(typeof apiKey == "string" && apiKey != ""){
				obj = {
					"url": "https://www.googleapis.com/youtube/v3/channels",
					"overrideMimeType": "text/plain; charset=utf-8",
					"content": [
						["part", "snippet"],
						["id", website_channel_id.exec(id)[1]],
						["fields", "items(id,snippet)"],
						["key", apiKey]
					]
				}
				if(typeof referrer == "string" && referrer != ""){
					obj.headers = {
						"referrer": referrer
					}
				}
			} else {
				obj = {
					"url": `https://www.youtube.com/channel/${website_channel_id.exec(id)[1]}`,
					"overrideMimeType": "text/html; charset=utf-8",
					"contentType": "document",
					"Request_documentParseToJSON": youtube.Request_documentParseToJSON
				}
			}
			return obj;
		},
	"importAPI": function(id){
		let obj = {
			"url": "https://www.youtube.com/subscription_manager?action_takeout=1",
			"overrideMimeType": "application/xml; charset=utf-8",
			"customJSONParse": "xmlToJSON"
		}
		return obj;
	},
	"checkResponseValidity":
		function(data){
			if(data.hasOwnProperty("error") == true && typeof data.error == "object"){
				if(data.error.hasOwnProperty("message") == true && typeof data.error.message == "string"){
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
			let data = xhrResponse.json;
			if(responseValidity == "success"){
				if(data.hasOwnProperty("items") == true && typeof data.items.length == "number" && data.items.length == 1){
					if(data.items[0].hasOwnProperty("snippet") == true && data.items[0].snippet.hasOwnProperty("channelId") == true){
						return `channel::${data.items[0].snippet.channelId}`;
					} else if(data.items[0].hasOwnProperty("id") == true && typeof data.items[0].id == "string"){
						return `channel::${data.items[0].id}`;
					}
				} else if(data.hasOwnProperty("channelId")){
					let dataDocument = xhrResponse.response;
					
					let channelIdPropItem = dataDocument.querySelector("meta[itemprop=channelId]");
					if(channelIdPropItem != null && typeof channelIdPropItem.hasAttribute("content")){
						return `channel::${channelIdPropItem.getAttribute("content")}`;
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
			
			if(data.hasOwnProperty("channelId")){
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
			} else if(data.hasOwnProperty("items") == true && typeof data.items.length == "number" && data.items.length == 1){
				streamData.streamURL = "https://www.youtube.com/watch?v=" + contentId;
				
				data = data.items[0]
				snippetData = data.snippet;
				
				if(typeof snippetData.title == "string" && snippetData.title != ""){
					streamData.streamName = snippetData.title;
				}
				/*if(typeof snippetData.description == "string" && snippetData.description != ""){
					streamData.streamStatus = snippetData.description;
				}*/
				if(typeof currentChannelInfo == "object" && currentChannelInfo != null && typeof currentChannelInfo.streamName == "string"){
					streamData.streamStatus = streamData.streamName;
					streamData.streamName = currentChannelInfo.streamName;
				}
				
				if(snippetData.hasOwnProperty("thumbnails") == true){
					if(snippetData.thumbnails.hasOwnProperty("high") == true && snippetData.thumbnails.high.hasOwnProperty("url") == true && typeof snippetData.thumbnails.high.url == "string"){
						streamData.streamOwnerLogo = snippetData.thumbnails.high.url;
					} else if(snippetData.thumbnails.hasOwnProperty("default") == true && snippetData.thumbnails["default"].hasOwnProperty("url") == true && typeof snippetData.thumbnails.high.url == "string"){
						streamData.streamOwnerLogo = snippetData.thumbnails["default"].url;
					}
				}
				
				streamData.streamCurrentViewers = "";
				if(data.hasOwnProperty("liveStreamingDetails") == true && data.liveStreamingDetails.hasOwnProperty("concurrentViewers") == true && typeof data.liveStreamingDetails.concurrentViewers != "undefined"){
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
			} else {
				return null;
			}
		},
	"channelList":
		function(id, website, data, pageNumber){
			let obj = {
				streamList: new Map()
			}
			
			if(data.hasOwnProperty("list") == true){
				let list = data.list;
				
				for(let contentId in list){
					obj.streamList.set(contentId, list[contentId]);
				}
				
				return obj;
			} else if(data.hasOwnProperty('items') == false){
				return obj;
			} else {
				let list = data.items;
				
				for(let i in list){
					let contentId = list[i].id.videoId;
					obj.streamList.set(contentId, null);
				}
				
				if(data.hasOwnProperty("nextPageToken") == true){
					obj.nextPageToken = data.nextPageToken;
				}
				return obj;
			}
		},
	"channelInfosProcess":
		function(id, data, currentChannelInfo){
			let streamData = currentChannelInfo;
			
			if(data.hasOwnProperty("channelId")){
				if(typeof data.name == "string" && data.url != ""){
					streamData.streamName = data.name;
				}
				
				if(data.hasOwnProperty("thumbnailUrl") && typeof data.thumbnailUrl == "string" && data.thumbnailUrl != ""){
					streamData.streamOwnerLogo = data.thumbnailUrl;
				} else if(data.hasOwnProperty("thumbnail") && data.hasOwnProperty("url") && typeof data.thumbnail.url == "string" && data.thumbnail.url != ""){
					streamData.streamOwnerLogo = data.thumbnail.url;
				}
				
				let urlFound = false;
				if(data.hasOwnProperty("author")){
					if(Array.isArray(data.author)){
						for(let item of data.author){
							if(typeof item == "string" && item.indexOf("youtube.com/") != -1){
								streamData.streamURL = item;
								urlFound = true;
								break;
							}
						}
					} else {
						if(typeof data.author == "string" && data.author.indexOf("youtube.com/") != -1){
							streamData.streamURL = data.author;
							urlFound = true;
						}
					}
				} else if(!urlFound){
					if(data.hasOwnProperty("url") && typeof data.url == "string" && data.url.indexOf("youtube.com/") != -1){
						streamData.streamURL = data.url;
					}
				}
			} else if(data.hasOwnProperty("items") == true && typeof data.items.length == "number" && data.items.length == 1){
				data = data.items[0].snippet;
				
				if(typeof data.title == "string" && data.title != ""){
					streamData.streamName = data.title;
				}
				if(typeof data.customUrl == "string" && data.customUrl != ""){
					streamData.streamURL = "http://www.youtube.com/c/" + data.customUrl;
				}
				
				if(data.hasOwnProperty("thumbnails") == true){
					if(data.thumbnails.hasOwnProperty("high") == true && data.thumbnails.high.hasOwnProperty("url") == true && typeof data.thumbnails.high.url == "string"){
						streamData.streamOwnerLogo = data.thumbnails.high.url;
					} else if(data.thumbnails.hasOwnProperty("default") == true && data.thumbnails["default"].hasOwnProperty("url") == true && typeof data.thumbnails.high.url == "string"){
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
			}
			
			if(data != null && data.hasOwnProperty("outline") && data.outline.hasOwnProperty("outline") && Array.isArray(data.outline.outline)){
				obj.list = [];
				let getId = /https\:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id\=([^&]+)/i;
				data.outline.outline.forEach((item) => {
					if(getId.test(item.xmlUrl)){
						obj.list.push(`channel::${getId.exec(item.xmlUrl)[1]}`);
					}
				});
			}
			return obj;
		}
}
websites.set("youtube", youtube);
