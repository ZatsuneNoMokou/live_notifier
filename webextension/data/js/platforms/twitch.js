const twitch = {
	"title": "Twitch",
	"addStream_URLpatterns": new Map([
		["twitch", [
			/^(?:http|https):\/\/(?:www|go|m)\.twitch\.tv\/([^\/\?\&]+).*$/,/^(?:http|https):\/\/player\.twitch\.tv\/\?channel\=([\w\-]+).*$/
		]]
	]),
	"API_addStream":
		function(source_website, id){
			return twitch.API(id);
		},
	"API":
		function(id){
			return {
				"url": `https://api.twitch.tv/kraken/streams/${id}`,
				"overrideMimeType": "application/vnd.twitchtv.v5+json; charset=utf-8", //"text/plain; charset=utf-8"
				"content": [
					["client_id","kll57pgmkzth3mcr2p184gstqi77ex2"]
				]
			};
		},
	"API_second":
		function(id){
			return {
				"url": `https://api.twitch.tv/kraken/users/${id}`,
				"overrideMimeType": "application/vnd.twitchtv.v5+json; charset=utf-8", //"text/plain; charset=utf-8"
				"content": [
					["client_id","kll57pgmkzth3mcr2p184gstqi77ex2"]
				]
			};
		},
	"importAPI":
		function(id){
			return {
				"url": `https://api.twitch.tv/kraken/users/${id}/follows/channels`,
				"overrideMimeType": "application/vnd.twitchtv.v5+json; charset=utf-8", //"text/plain; charset=utf-8"
				"content": [
					["client_id","kll57pgmkzth3mcr2p184gstqi77ex2"]
				]
			};
		},
	"checkResponseValidity":
		function(data){
			if(data.hasOwnProperty("error")){
				if(typeof data.message === "string"){
					return data.message;
				} else if(typeof data.error === "string"){
					return data.error;
				} else {
					return "error";
				}
			} else {
				return "success";
			}
		},
	"addStream_getId":
		function(source_website, id, response, streamListSetting, responseValidity){
			const data = response.json;
			if(responseValidity === "success"){
				return {
					streamId: id,
					streamName: (data.stream && data.stream.channel && typeof data.stream.channel.display_name === "string")? data.stream.channel.display_name : id
				};
			}
			return null;
		},
	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus, currentChannelInfo){
			let streamData = currentLiveStatus;
			if(data.hasOwnProperty("stream")){
				data = data["stream"];
				streamData.liveStatus.API_Status = (data !== null);
				if(data !== null){
					streamData.streamName = data["channel"]["display_name"];
					streamData.streamStatus = (data["channel"]["status"] !== null)? data["channel"]["status"] : "";
					streamData.streamGame = (data["game"] !== null && typeof data["game"] === "string")? data["game"] : "";
					if(typeof data.channel["logo"] === "string" && data.channel["logo"] !== "") {
						streamData.streamOwnerLogo = data.channel["logo"];
					}
					if(typeof data.channel["url"] === "string" && data.channel["url"] !== "") {
						streamData.streamURL = data.channel["url"];
					}
					streamData.streamCurrentViewers = parseInt(data["viewers"]);
					
					return streamData;
				} else {
					if(streamData.streamName === ""){
						streamData.streamName = id;
					}
					return streamData;
				}
			} else {
				return null;
			}
		},
	"seconderyInfo":
		function(id, contentId, data, currentLiveStatus){
			let streamData = currentLiveStatus;
			if(typeof data["display_name"] === "string"){
				streamData.streamName = data["display_name"];
			}
			if(typeof data["logo"] === "string" && data["logo"] !== ""){
				streamData.streamOwnerLogo = data["logo"];
			}
			return streamData;
		},
	"importStreamWebsites":
		function(id, data, streamListSetting){
			let obj = {
				list: []
			};
			
			if(data.hasOwnProperty("error")){
				obj.list = null;
			} else {
				if(typeof data.follows === "object"){
					for(let item of data.follows){
						obj.list.push(item["channel"]["display_name"]);
					}

					if(data.follows.length > 0 && typeof data._links.next === "string"){
						obj.next = {"url": data._links.next};
					}
				}
			}
			
			return obj;
		}
};
websites.set("twitch", twitch);
