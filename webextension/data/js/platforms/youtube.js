let youtube = {
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
			let jsonDATA = {};
			
			let parser = new DOMParser();
			
			let getPropValue = function(node){
				let id = node.getAttribute("itemprop");
				switch(node.tagName.toLowerCase()){
					case "meta":
						return node.getAttribute("content");
						break;
					case "link":
						return node.getAttribute("href");
						break;
					case "span":
						let content = {};
						let subNodesDoc = parser.parseFromString(node.innerHTML, "text/html");
						let subItemProps = subNodesDoc.querySelectorAll("[itemprop]");
						
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
			return jsonDATA;
		},
	"APIs_RequiredPrefs": [
		"youtube_api_key",
		"youtube_api_referrer",
		"youtube_patreon_password"
	],
	"API_addStream":
		function(source_website, id, prefs){
			let apiKey = prefs.youtube_api_key,
				referrer = prefs.youtube_api_referrer,
				youtube_patreon_password = prefs.youtube_patreon_password;
			
			let obj = {};
			if(source_website == "c::youtube"){
					obj.url = `https://www.youtube.com/c/${id}`;
					obj.overrideMimeType = "text/html; charset=utf-8";
					obj.contentType = "document";
			/*} else if(youtube_patreon_password != ""){
				if(source_website == "user::youtube"){
					obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getIdFromUser.php?user=${id}&password=${youtube_patreon_password}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				} else if(source_website == "video::youtube"){
					obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getIdFromVid.php?vid=${id}&password=${youtube_patreon_password}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				} else if(website_channel_id.test(source_website) == true){
					return youtube.API_channelInfos(`channel::${id}`, prefs);
				}
			} else if(typeof apiKey == "string" && apiKey != ""){
				if(typeof referrer == "string" && referrer != ""){
					obj.headers = {
						"referrer": referrer
					}
				}
				if(source_website == "user::youtube"){
					obj.url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forUsername=${id}&fields=items(id)&key=${apiKey}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				} else if(source_website == "video::youtube"){
					obj.url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&fields=items(snippet(channelId))&key=${apiKey}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				} else if(website_channel_id.test(source_website) == true){
					return youtube.API_channelInfos(`channel::${id}`, prefs);
				}
			}*/
			} else if(source_website == "user::youtube"){
				obj.url = `https://www.youtube.com/user/${id}`;
				obj.overrideMimeType = "text/html; charset=utf-8";
				obj.contentType = "document";
			} else if(source_website == "video::youtube"){
				obj.url = `https://www.youtube.com/watch?v=${id}`;
				obj.overrideMimeType = "text/html; charset=utf-8";
				obj.contentType = "document";
			} else if(website_channel_id.test(source_website) == true){
				return youtube.API_channelInfos(`channel::${id}`, prefs);
			}
			return obj;
		},
	"API":
		function(id, prefs){
			let apiKey = prefs.youtube_api_key,
				referrer = prefs.youtube_api_referrer,
				youtube_patreon_password = prefs.youtube_patreon_password;
			
			let obj = {};
			
			if(youtube_patreon_password != ""){
				if(website_channel_id.test(id)){
					obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getLives.php?id=${website_channel_id.exec(id)[1]}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				} else {
					obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getLiveInfo.php?id=${id}&password=${youtube_patreon_password}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				}
			} else if(typeof apiKey == "string" && apiKey != ""){
				if(typeof referrer == "string" && referrer != ""){
					obj.headers = {
						"referrer": referrer
					}
				}
				if(website_channel_id.test(id)){
					obj.url = `https://www.googleapis.com/youtube/v3/search?eventType=live&part=id&channelId=${website_channel_id.exec(id)[1]}&type=video&fields=items(id)&key=${apiKey}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				} else {
					obj.url = `https://www.googleapis.com/youtube/v3/videos?part=id,liveStreamingDetails,snippet&id=${id}&type=video&fields=items(id,liveStreamingDetails,snippet)&key=${apiKey}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				}
			} else {
				if(website_channel_id.test(id)){
					obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getLives.php?id=${website_channel_id.exec(id)[1]}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				} else {
					obj.url = `http://www.youtube.com/watch?v=${id}`;
					obj.overrideMimeType = "text/html; charset=utf-8";
					obj.contentType = "document";
				}
			}
			return obj;
		},
	"API_channelInfos":
		function(id, prefs){
			let apiKey = prefs.youtube_api_key,
				referrer = prefs.youtube_api_referrer,
				youtube_patreon_password = prefs.youtube_patreon_password;
			
			let obj = {};
			
			if(youtube_patreon_password != ""){
				obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getChannel.php?id=${website_channel_id.exec(id)[1]}&password=${youtube_patreon_password}`;
				obj.overrideMimeType = "text/plain; charset=utf-8";
			} else if(typeof apiKey == "string" && apiKey != ""){
				if(typeof referrer == "string" && referrer != ""){
					obj.headers = {
						"referrer": referrer
					}
				}
				obj.url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${website_channel_id.exec(id)[1]}&fields=items(id,snippet)&key=${apiKey}`;
				obj.overrideMimeType = "text/plain; charset=utf-8";
			} else {
				obj.url = `https://www.youtube.com/channel/${website_channel_id.exec(id)[1]}`;
				obj.overrideMimeType = "text/html; charset=utf-8";
				obj.contentType = "document";
			}
			return obj;
		},
	/*"importAPI": function(id){
		let obj = {
			url: ``,
			overrideMimeType: "text/plain; charset=utf-8"
		}
		return obj;
	},*/
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
			if(data.hasOwnProperty('items') == false){
				return obj;
			} else {
				let list = data.items;
				
				for(let i in list){
					let contentId = list[i].id.videoId;
					obj.streamList.set(contentId, null);
				}
				
				if(data.hasOwnProperty("nextPageToken") == true){
					let next_url = youtube.API(website_channel_id.exec(id)[1]).url;
					let next_page_number = ((typeof pageNumber == "number")? pageNumber : 1) + 1;
					obj.next = {"url": next_url + "&pageToken=" + data.nextPageToken, "pageNumber": next_page_number};
				} else {
					obj.next = null;
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
							streamData.streamURL = item;
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
		}/*,
	"importStreamWebsites":
		function(id, data, streamListSetting, pageNumber){

		}*/
}
websites.set("youtube", youtube);
