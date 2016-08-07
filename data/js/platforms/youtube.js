const website_channel_id = /channel\:\:(.*)/,
	facebookID_from_url = /(?:http|https):\/\/(?:www\.)?facebook.com\/([^\/]+)(?:\/.*)?/,
	twitterID_from_url = /(?:http|https):\/\/(?:www\.)?twitter.com\/([^\/]+)(?:\/.*)?/;

let youtube = {
	"addStream_URLpatterns": {
		"channel::youtube": [
			/(?:http|https):\/\/(?:www\.)?youtube\.com\/channel\/([^\/\?\&\#]+)*.*/
		],
		"user::youtube": [
			/(?:http|https):\/\/(?:www\.)?youtube\.com\/user\/([^\/\?\&\#]+)*.*/
		],
		"video::youtube": [
			/(?:http|https):\/\/(?:www\.)?youtube\.com\/watch\?v\=([^\/\?\&\#]+)*.*/,
			/(?:http|https):\/\/(?:www\.)?youtu\.be\/([^\/\?\&\#]+)*.*/
		],
		"c::youtube": [
			/(?:http|https):\/\/(?:www\.)?youtube\.com\/c\/([^\/\?\&\#]+)*.*/
		]
	},
	"addStream_URLpatterns_strings": {
		"channel::youtube": [
			"*://www.youtube.com/channel/*",
			"*://www.youtube.com/user/*"
		],
		"user::youtube": [
			"*://www.youtube.com/user/*"
		],
		"video::youtube": [
			"*://www.youtube.com/watch?v=*"
		],
		"c::youtube": [
			"*://www.youtube.com/c/*"
		]
	},
	"APIs_RequiredPrefs": [
		"youtube_api_key",
		"youtube_api_referrer"
	],
	"API_addStream":
		function(source_website, id, prefs){
			let apiKey = prefs.youtube_api_key;
			let referrer = prefs.youtube_api_referrer;
			
			let obj = {};
			if(source_website == "c::youtube"){
					obj.url = `https://www.youtube.com/c/${id}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
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
			} else {
				if(source_website == "user::youtube"){
					obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getIdFromUser.php?user=${id}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				} else if(source_website == "video::youtube"){
					obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getIdFromVid.php?vid=${id}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				} else if(website_channel_id.test(source_website) == true){
					return youtube.API_channelInfos(`channel::${id}`, prefs);
				}
			}
			return obj;
		},
	"API":
		function(id, prefs){
			let apiKey = prefs.youtube_api_key;
			let referrer = prefs.youtube_api_referrer;
			
			let obj = {};
			if(typeof apiKey == "string" && apiKey != ""){
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
					obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getLiveInfo.php?id=${id}`;
					obj.overrideMimeType = "text/plain; charset=utf-8";
				}
			}
			return obj;
		},
	"API_channelInfos":
		function(id, prefs){
			let apiKey = prefs.youtube_api_key;
			let referrer = prefs.youtube_api_referrer;
			
			let obj = {};
			if(typeof apiKey == "string" && apiKey != ""){
				if(typeof referrer == "string" && referrer != ""){
					obj.headers = {
						"referrer": referrer
					}
				}
				obj.url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${website_channel_id.exec(id)[1]}&fields=items(snippet)&key=${apiKey}`;
				obj.overrideMimeType = "text/plain; charset=utf-8";
			} else {
				obj.url = `https://livenotifier.zatsunenomokou.eu/youtube_getChannel.php?id=${website_channel_id.exec(id)[1]}`;
				obj.overrideMimeType = "text/plain; charset=utf-8";
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
		function(id, response, streamListSetting, responseValidity){
			let data = response.json;
			if(responseValidity == "success" && data.hasOwnProperty("items") == true && typeof data.items.length == "number" && data.items.length == 1){
				if(data.items[0].hasOwnProperty("snippet") == true && data.items[0].snippet.hasOwnProperty("channelId") == true){
					return `channel::${data.items[0].snippet.channelId}`;
				} else if(data.items[0].hasOwnProperty("id") == true && typeof data.items[0].id == "string"){
					return `channel::${data.items[0].id}`;
				}
			} else if(responseValidity == "parse_error"){
				let parser = new DOMParser();
				let dataDocument = parser.parseFromString(response.text, "text/html");
				let linkNode = dataDocument.querySelector("#content .qualified-channel-title a");
				if(typeof linkNode.tagName == "string"){
					let linkResult = linkNode.outerHTML.match(/href=\"([^\"]+)\"/);
					if(linkResult != null && typeof linkResult[1] == "string"){
						let obj = {"url": `https:\/\/www.youtube.com${(/^\/.*/.test(linkResult[1]))? "" : "/"}${linkResult[1]}`};
						return obj;
					}
				}
				return null;
			}
			return null;
		},
	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus, currentChannelInfo){
			let streamData = currentLiveStatus;
			
			if(data.hasOwnProperty("items") == true && typeof data.items.length == "number" && data.items.length == 1){
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
				return streamData.liveStatus.API_Status;
			}
		},
	"channelList":
		function(id, website, data, pageNumber){
			let obj = {
				streamList: {}
			}
			if(data.hasOwnProperty('items') == false){
				return obj;
			} else {
				let list = data.items;
				
				for(let i in list){
					let contentId = list[i].id.videoId;
					obj.streamList[contentId] = null;
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
			
			if(data.hasOwnProperty("items") == true && typeof data.items.length == "number" && data.items.length == 1){
				data = data.items[0].snippet;
				
				if(typeof data.title == "string" && data.title != ""){
					streamData.streamName = data.title;
				}
				/*if(typeof data.description == "string" && data.description != ""){
					streamData.streamStatus = data.description;
				}*/
				
				if(data.hasOwnProperty("thumbnails") == true){
					if(data.thumbnails.hasOwnProperty("high") == true && data.thumbnails.high.hasOwnProperty("url") == true && typeof data.thumbnails.high.url == "string"){
						streamData.streamOwnerLogo = data.thumbnails.high.url;
					} else if(data.thumbnails.hasOwnProperty("default") == true && data.thumbnails["default"].hasOwnProperty("url") == true && typeof data.thumbnails.high.url == "string"){
						streamData.streamOwnerLogo = data.thumbnails["default"].url;
					}
				}
			}
		}/*,
	"importStreamWebsites":
		function(id, data, streamListSetting, pageNumber){

		}*/
}

module.exports = Object.freeze(youtube);
