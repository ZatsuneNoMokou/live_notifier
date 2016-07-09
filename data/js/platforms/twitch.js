const website_channel_id = /channel\:\:(.*)/,
	facebookID_from_url = /(?:http|https):\/\/(?:www\.)?facebook.com\/([^\/]+)(?:\/.*)?/,
	twitterID_from_url = /(?:http|https):\/\/(?:www\.)?twitter.com\/([^\/]+)(?:\/.*)?/;

let twitch = {
	"API":
		function(id){
			let obj = {
				url: `https://api.twitch.tv/kraken/streams/${id}`,
				overrideMimeType: "application/vnd.twitchtv.v3+json; charset=utf-8" //"text/plain; charset=utf-8"
			}
			return obj;
		},
	"API_second":
		function(id){
			let obj = {
				url: `https://api.twitch.tv/kraken/users/${id}`,
				overrideMimeType: "application/vnd.twitchtv.v3+json; charset=utf-8" //"text/plain; charset=utf-8"
			}
			return obj;
		},
	"importAPI":
		function(id){
			let obj = {
				url: `https://api.twitch.tv/kraken/users/${id}/follows/channels`,
				overrideMimeType: "application/vnd.twitchtv.v3+json; charset=utf-8"
			}
			return obj;
		},
	"isValidResponse":
		function(data){
			if(data.error == "Not Found"){
				return "error";
			} else {
				return "";
			}
		},
	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus){
			let streamData = currentLiveStatus;
			if(data.hasOwnProperty("stream")){
				data = data["stream"];
				if(data != null){
					streamData.streamName = data["channel"]["display_name"];
					streamData.streamStatus = (data["channel"]["status"] != null)? data["channel"]["status"] : "";
					streamData.streamGame = (data["game"] !== null && typeof data["game"] == "string")? data["game"] : "";
					if(typeof data.channel["logo"] == "string" && data.channel["logo"] != "") {
						streamData.streamOwnerLogo = data.channel["logo"];
					}
					if(typeof data.channel["url"] == "string" && data.channel["url"] != "") {
						streamData.streamURL = data.channel["url"];
					}
					streamData.streamCurrentViewers = parseInt(data["viewers"]);
					
					streamData.online = true;
					return streamData.online;
				} else {
					if(streamData.streamName == ""){
						streamData.streamName = id;
					}
					streamData.online = false;
					return streamData.online;
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
module.exports = twitch;
