const website_channel_id = /channel\:\:(.*)/,
	facebookID_from_url = /(?:http|https):\/\/(?:www\.)?facebook.com\/([^\/]+)(?:\/.*)?/,
	twitterID_from_url = /(?:http|https):\/\/(?:www\.)?twitter.com\/([^\/]+)(?:\/.*)?/;

let twitch = {
	"addStream_URLpatterns": new Map([
		["twitch", [
			/^(?:http|https):\/\/www\.twitch\.tv\/([^\/\?\&]+).*$/,/^(?:http|https):\/\/player\.twitch\.tv\/\?channel\=([\w\-]+).*$/
		]]
	]),
	"API_addStream":
		function(source_website, id, prefs){
			return twitch.API(id, prefs);
		},
	"API":
		function(id, prefs){
			let obj = {
				url: `https://api.twitch.tv/kraken/streams/${id}`,
				overrideMimeType: "application/vnd.twitchtv.v3+json; charset=utf-8" //"text/plain; charset=utf-8"
			}
			return obj;
		},
	"API_second":
		function(id, prefs){
			let obj = {
				url: `https://api.twitch.tv/kraken/users/${id}`,
				overrideMimeType: "application/vnd.twitchtv.v3+json; charset=utf-8" //"text/plain; charset=utf-8"
			}
			return obj;
		},
	"importAPI":
		function(id, prefs){
			let obj = {
				url: `https://api.twitch.tv/kraken/users/${id}/follows/channels`,
				overrideMimeType: "application/vnd.twitchtv.v3+json; charset=utf-8"
			}
			return obj;
		},
	"checkResponseValidity":
		function(data){
			if(data.hasOwnProperty("error")){
				if(typeof data.message == "string"){
					return data.message;
				} else if(typeof data.error == "string"){
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
			let data = response.json;
			if(responseValidity == "success"){
				return id;
			}
			return null;
		},
	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus, currentChannelInfo){
			let streamData = currentLiveStatus;
			if(data.hasOwnProperty("stream")){
				data = data["stream"];
				streamData.liveStatus.API_Status = (data != null);
				if(data != null){
					streamData.streamName = data["channel"]["display_name"];
					streamData.streamStatus = (data["channel"]["status"] != null)? data["channel"]["status"] : "";
					streamData.streamGame = (data["game"] != null && typeof data["game"] == "string")? data["game"] : "";
					if(typeof data.channel["logo"] == "string" && data.channel["logo"] != "") {
						streamData.streamOwnerLogo = data.channel["logo"];
					}
					if(typeof data.channel["url"] == "string" && data.channel["url"] != "") {
						streamData.streamURL = data.channel["url"];
					}
					streamData.streamCurrentViewers = parseInt(data["viewers"]);
					
					return streamData.liveStatus.API_Status;
				} else {
					if(streamData.streamName == ""){
						streamData.streamName = id;
					}
					return streamData.liveStatus.API_Status;
				}
			} else {
				return null;
			}
		},
	"seconderyInfo":
		function(id, contentId, data, currentLiveStatus, isStreamOnline){
			let streamData = currentLiveStatus;
			if(typeof data["display_name"] == "string"){
				streamData.streamName = data["display_name"];
			}
			if(typeof data["logo"] == "string" && data["logo"] != ""){
				streamData.streamOwnerLogo = data["logo"];
			}
		},
	"importStreamWebsites":
		function(id, data, streamListSetting){
			let obj = {
				list: []
			}
			
			if(typeof data.follows == "object"){
				for(let item of data.follows){
					obj.list.push(item["channel"]["display_name"]);
				}
				
				if(data.follows.length > 0 && typeof data._links.next == "string"){
					obj.next = {"url": data._links.next};
				} else {
					obj.next = null;
				}
			}
			
			return obj;
		}
}
module.exports = Object.freeze(twitch);
