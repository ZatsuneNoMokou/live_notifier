const website_channel_id = /channel\:\:(.*)/,
	facebookID_from_url = /(?:http|https):\/\/(?:www\.)?facebook.com\/([^\/]+)(?:\/.*)?/,
	twitterID_from_url = /(?:http|https):\/\/(?:www\.)?twitter.com\/([^\/]+)(?:\/.*)?/;

let dailymotion = {
	"addStream_URLpatterns": new Map([
		["dailymotion", [
			/^(?:http|https):\/\/games\.dailymotion\.com\/(?:live|video)\/([a-zA-Z0-9]+).*$/,
			/^(?:http|https):\/\/www\.dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+).*$/,
			/^(?:http|https):\/\/games\.dailymotion\.com\/[^\/]+\/v\/([a-zA-Z0-9]+).*$/,
			/^(?:http|https):\/\/games\.dailymotion\.com\/[^\/]+\/([a-zA-Z0-9]+).*$/
		]],
		["channel::dailymotion", [
			/^(?:http|https):\/\/(?:games\.|www\.)dailymotion\.com\/user\/([^\s\t\/\?]+).*$/,
			/^(?:http|https):\/\/(?:games\.|www\.)dailymotion\.com\/([^\s\t\/\?]+).*$/
		]]
	]),
	"addStream_URLpatterns_strings": {
		"dailymotion": [
			"*://games.dailymotion.com/live/*",
			"*://games.dailymotion.com/video/*",
			"*://www.dailymotion.com/video/*",
			"*://www.dailymotion.com/live/*",
			"*://games.dailymotion.com/v/.*"
		],
		"channel::dailymotion": [
			"*://www.dailymotion.com/*",
			"*://games.dailymotion.com/*"
		]
	},
	"API_addStream":
		function(source_website, id, prefs){
			if(website_channel_id.test(source_website) == true){
				return dailymotion.API_channelInfos(`channel::${id}`, prefs);
			} else {
				return dailymotion.API(id, prefs);
			}
		},
	"API":
		function(id, prefs){
			let obj = {
				url: `https://api.dailymotion.com/video/${id}?fields=id,title,owner,user.username,audience,url,game.title,mode,onair?_=${new Date().getTime()}`,
				overrideMimeType: "text/plain; charset=latin1"
			}
			if(website_channel_id.test(id)){
				obj.url = `https://api.dailymotion.com/videos?live_onair&owners=${website_channel_id.exec(id)[1]}&fields=id,title,owner,audience,url,mode,onair?_= ${new Date().getTime()}`;
			}
			return obj;
		},
	"API_channelInfos":
		function(id, prefs){
			id = (website_channel_id.test(id))? website_channel_id.exec(id)[1] : id;
			let obj = {
				url: `https://api.dailymotion.com/user/${id}?fields=id,username,screenname,url,avatar_720_url,facebook_url,twitter_url`,
				overrideMimeType: "text/plain; charset=latin1"
			}
			return obj;
		},
	"API_second":
		function(id, prefs){
			let obj = {
				url: `https://api.dailymotion.com/video/${id}?fields=id,user.screenname,user.avatar_720_url,user.facebook_url,user.twitter_url`,
				overrideMimeType: "text/plain; charset=latin1"
			}
			return obj;
		},
	"importAPI": function(id, prefs){
		let obj = {
			url: `https://api.dailymotion.com/user/${id}/following?fields=id,username,facebook_url,twitter_url?_=${new Date().getTime()}`,
			overrideMimeType: "text/plain; charset=latin1"
		}
		return obj;
	},
	"checkResponseValidity":
		function(data){
			if(typeof data.error == "object"){
				if(typeof data.error.type == "string"){
					// Error types: https://developer.dailymotion.com/api#error-types
					return data.error.type;
				} else {
					return "error";
				}
			} else if(typeof data.id == "string"){
				return "success";
			} else if(data.mode == "vod"){
				return "vod";
			} else if(data.mode != "live" && typeof data.list == "undefined"){
				return "notstream";
			} else {
				return "success";
			}
		},
	"addStream_getId":
		function(source_website, id, response, streamListSetting, responseValidity){
			let data = response.json;
			if(responseValidity == "success" || responseValidity == "vod" || responseValidity == "notstream"){
				let username = (typeof data.mode == "string")? data["user.username"] : data.username;
				let id_username = `channel::${username}`;
				let id_owner = `channel::${(typeof data.mode == "string")? data.owner : data.id}`;
				
				// Use username (login) as channel id
				let id = id_owner;
				if(streamListSetting.streamExist("dailymotion", id_username) || streamListSetting.streamExist("dailymotion", id_owner)){
					return true;
				}
				return id;
			}
			return null;
		},
	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus, currentChannelInfo){
			let streamData = currentLiveStatus;
			streamData.streamName = data.title;
			streamData.streamCurrentViewers = JSON.parse(data.audience);
			streamData.streamURL = data.url;
			streamData.streamGame = (data.hasOwnProperty("game.title") && data["game.title"] != null && typeof data["game.title"] == "string")? data["game.title"] : "";
			if(typeof data.onair == "boolean"){
				streamData.liveStatus.API_Status = data.onair;
				return streamData.liveStatus.API_Status;
			} else {
				return null;
			}
		},
	"seconderyInfo":
		function(id, contentId, data, currentLiveStatus, isStreamOnline){
			let streamData = currentLiveStatus;
			if(data.hasOwnProperty("user.screenname")){
				if(isStreamOnline){
					streamData.streamStatus = streamData.streamName;
					streamData.streamGame = (data["game.title"] != null && typeof data["game.title"] == "string")? data["game.title"] : "";
				}
				if(typeof data["user.avatar_720_url"] == "string" && data["user.avatar_720_url"] != ""){
					streamData.streamOwnerLogo = data["user.avatar_720_url"];
				}
				streamData.streamName = data["user.screenname"];
				
				if(typeof data["user.facebook_url"] == "string" && data["user.facebook_url"] != "" && facebookID_from_url.test(data["user.facebook_url"])){
					streamData.facebookID = facebookID_from_url.exec(data["user.facebook_url"])[1];
				}
				if(typeof data["user.twitter_url"] == "string" && data["user.twitter_url"] != "" && twitterID_from_url.test(data["user.twitter_url"])){
					streamData.facebookID = twitterID_from_url.exec(data["user.twitter_url"])[1];
				}
			}
		},
	"channelList":
		function(id, website, data, pageNumber){
			let list = data.list;
			
			let obj = {
				streamList: new Map()
			}
			if(data.total == 0){
				return obj;
			} else {
				for(let i in list){
					let contentId = list[i].id;
					obj.streamList.set(contentId, list[i]);
				}
				
				if(data.has_more){
					let next_url = dailymotion.API(website_channel_id.exec(id)[1]).url;
					let next_page_number = ((typeof pageNumber == "number")? pageNumber : 1) + 1;
					obj.next = {"url": next_url + "&page=" + next_page_number, "pageNumber": next_page_number};
				} else {
					obj.next = null;
				}
				return obj;
			}
		},
	"channelInfosProcess":
		function(id, data, currentChannelInfo){
			let streamData = currentChannelInfo;
			if(data.hasOwnProperty("screenname")){
				streamData.streamName = data["screenname"];
				streamData.streamURL = data.url;
				if(typeof data["avatar_720_url"] == "string" && data["avatar_720_url"] != ""){
					streamData.streamOwnerLogo = data["avatar_720_url"];
				}
				
				if(typeof data["facebook_url"] == "string" && data["facebook_url"] != "" && facebookID_from_url.test(data["facebook_url"])){
					streamData.facebookID = facebookID_from_url.exec(data["facebook_url"])[1];
				}
				if(typeof data["twitter_url"] == "string" && data["twitter_url"] != "" && twitterID_from_url.test(data["twitter_url"])){
					streamData.facebookID = twitterID_from_url.exec(data["twitter_url"])[1];
				}
			}
			return streamData;
		},
	"importStreamWebsites":
		function(id, data, streamListSetting, pageNumber){
			let obj = {
				list: []
			}
			
			if(data.total > 0){
				for(let item of data.list){
					if(!streamListSetting.streamExist("dailymotion", `channel::${item.id}`) && !streamListSetting.streamExist("dailymotion", `channel::${item.username}`)){
						obj.list.push(`channel::${item.id}`);
					} else {
						console.log(`${item.username} already exist`);
					}
				}
			}
			
			if(data.has_more){
				let nextPageNumber = ((typeof pageNumber == "number")? pageNumber : 1) + 1;
				let nextUrl = dailymotion.importAPI(id).url + "&page=" + nextPageNumber;
				obj.next = {"url": nextUrl, "pageNumber": nextPageNumber}
			} else {
				obj.next = null;
			}
			
			return obj;
		}
}
module.exports = Object.freeze(dailymotion);
