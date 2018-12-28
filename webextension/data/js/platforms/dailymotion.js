const dailymotion = {
	"title": "Dailymotion",
	"addStream_URLpatterns": new Map([
		["dailymotion", [
			/^(?:http|https):\/\/games\.dailymotion\.com\/(?:live|video)\/([a-zA-Z0-9]+).*$/,
			/^(?:http|https):\/\/www\.dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+).*$/,
			/^(?:http|https):\/\/games\.dailymotion\.com\/[^\/]+\/v\/([a-zA-Z0-9]+).*$/,
			/^(?:http|https):\/\/games\.dailymotion\.com\/[^\/]+\/([a-zA-Z0-9]+).*$/
		]],
		["channel::dailymotion", [
			/^(?:http|https):\/\/(?:games\.|www\.)dailymotion\.com\/user\/([^\s\t\/?]+).*$/,
			/^(?:http|https):\/\/(?:games\.|www\.)dailymotion\.com\/([^\s\t\/?]+).*$/
		]]
	]),
	"API_addStream":
		function(source_website, id){
			if(source_website === "channel::dailymotion"){
				return dailymotion.API_channelInfos(`channel::${id}`);
			} else {
				return dailymotion.API(id);
			}
		},
	"API":
		function(id, nextPageToken){
			let obj = {
				overrideMimeType: "text/plain; charset=latin1"
			};
			if(website_channel_id.test(id)){
				//obj.url = `https://api.dailymotion.com/videos?live_onair&owners=${website_channel_id.exec(id)[1]}&fields=id,title,owner,audience,url,mode,onair?_= ${new Date().getTime()}`;
				obj.url = "https://api.dailymotion.com/videos";
				obj.content = [
					["live_onair",""],
					["owner",website_channel_id.exec(id)[1]],
					["fields","id,title,owner,audience,url,mode,onair,thumbnail_120_url"],
					["_", new Date().getTime()]
				];
				if(typeof nextPageToken === "number"){obj.content.push(["page", nextPageToken]);}
			} else {
				//obj.url = `https://api.dailymotion.com/video/${id}?fields=id,title,owner,user.username,audience,url,game.title,mode,onair?_=${new Date().getTime()}`;
				obj.url = `https://api.dailymotion.com/video/${id}`;
				obj.content = [
					["fields","id,title,owner,user.username,audience,url,game.title,mode,onair,thumbnail_120_url"],
					["_", new Date().getTime()]
				]
			}
			return obj;
		},
	"API_channelInfos":
		function(id){
			id = (website_channel_id.test(id))? website_channel_id.exec(id)[1] : id;
			return {
				//url: `https://api.dailymotion.com/user/${id}?fields=id,username,screenname,url,avatar_720_url,twitter_url`,
				url: `https://api.dailymotion.com/user/${id}`,
				overrideMimeType: "text/plain; charset=latin1",
				content: [
					["fields","id,username,screenname,url,avatar_120_url,twitter_url"],
					["_", new Date().getTime()]
				]
			};
		},
	"API_second":
		function(id){
			return {
				//url: `https://api.dailymotion.com/video/${id}?fields=id,user.screenname,user.avatar_720_url,user.twitter_url`,
				url: `https://api.dailymotion.com/video/${id}`,
				overrideMimeType: "text/plain; charset=latin1",
				content: [
					["fields","id,user.screenname,user.avatar_120_url,user.twitter_url"],
					["_", new Date().getTime()]
				]
			};
		},
	"importAPI": function(id){
		return {
			url: `https://api.dailymotion.com/user/${id}/following?fields=id,username,twitter_url?_=${new Date().getTime()}`,
			overrideMimeType: "text/plain; charset=latin1"
		};
	},
	"checkResponseValidity":
		function(data){
			if(typeof data.error === "object"){
				if(typeof data.error.type === "string"){
					// Error types: https://developer.dailymotion.com/api#error-types
					return data.error.type;
				} else {
					return "error";
				}
			} else if(typeof data.id === "string"){
				return "success";
			} else if(data.mode === "vod"){
				return "vod";
			} else if(data.mode !== "live" && typeof data.list === "undefined"){
				return "notstream";
			} else {
				return "success";
			}
		},
	"addStream_getId":
		function(source_website, id, response, streamListSetting, responseValidity){
			const data = response.json;
			if(responseValidity === "success" || responseValidity === "vod" || responseValidity === "notstream"){
				let username = (typeof data.mode === "string")? data["user.username"] : data.username;
				let id_username = `channel::${username}`;
				let id_owner = `channel::${(typeof data.mode === "string")? data.owner : data.id}`;
				
				// Use username (login) as channel id
				let id = id_owner;
				if(streamListSetting.streamExist("dailymotion", id_username) || streamListSetting.streamExist("dailymotion", id_owner)){
					return true;
				}
				return {
					streamId: id,
					streamName: (typeof username === "string" && username !== "")? username : id
				};
			}
			return null;
		},
	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus, currentChannelInfo){
			let streamData = currentLiveStatus;
			streamData.streamName = data.title;
			streamData.streamCurrentViewers = parseInt(data.audience);
			streamData.streamURL = data.url;
			streamData.streamGame = (data.hasOwnProperty("game.title") && data["game.title"] !== null && typeof data["game.title"] === "string")? data["game.title"] : "";

			if(typeof data["thumbnail_120_url"] === "string" && data["thumbnail_120_url"] !== ""){
				streamData.streamOwnerLogo = data["thumbnail_120_url"];
			}

			streamData.liveStatus.API_Status = (typeof data.onair === "boolean" && data.onair === true)? data.onair : false;
			return streamData;
		},
	"seconderyInfo":
		function(id, contentId, data, currentLiveStatus){
			let streamData = currentLiveStatus;
			const isStreamOnline = streamData.liveStatus.API_Status;
			if(data.hasOwnProperty("user.screenname")){
				if(isStreamOnline){
					streamData.streamStatus = streamData.streamName;
					streamData.streamGame = (data["game.title"] !== null && typeof data["game.title"] === "string")? data["game.title"] : "";
				}
				/*if(typeof data["user.avatar_120_url"] === "string" && data["user.avatar_120_url"] !== ""){
					streamData.streamOwnerLogo = data["user.avatar_120_url"];
				}*/
				streamData.streamName = data["user.screenname"];

				if(typeof data["user.twitter_url"] === "string" && data["user.twitter_url"] !== "" && twitterID_from_url.test(data["user.twitter_url"])){
					streamData.twitterID = twitterID_from_url.exec(data["user.twitter_url"])[1];
				}
			}
			return streamData;
		},
	"channelList":
		function(id, website, data, pageNumber){
			const list = data.list;

			let obj = {
				streamList: new Map(),
				primaryRequest: false
			};
			if(data.total === 0){
				return obj;
			} else {
				for(let i in list){
					if(list.hasOwnProperty(i)){
						const contentId = list[i].id;
						obj.streamList.set(contentId, list[i]);
					}
				}

				if(data.has_more){
					const next_page_number = ((typeof pageNumber === "number")? pageNumber : 1) + 1;
					obj.nextPageToken = next_page_number;
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

				if(typeof data["avatar_120_url"] === "string" && data["avatar_120_url"] !== ""){
					streamData.streamOwnerLogo = data["avatar_120_url"];
				}

				if(typeof data["twitter_url"] === "string" && data["twitter_url"] !== "" && twitterID_from_url.test(data["twitter_url"])){
					streamData.twitterID = twitterID_from_url.exec(data["twitter_url"])[1];
				}
			}
			return streamData;
		},
	"importStreamWebsites":
		function(id, data, streamListSetting, pageNumber){
			let obj = {
				list: []
			};
			
			if(data.hasOwnProperty("list") === false){
				obj.list = null;
			} else {
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
					const nextPageNumber = ((typeof pageNumber === "number")? pageNumber : 1) + 1,
						nextUrl = dailymotion.importAPI(id).url + "&page=" + nextPageNumber;
					obj.next = {"url": nextUrl, "pageNumber": nextPageNumber}
				} else {
					obj.next = null;
				}
			}
			
			return obj;
		}
};
websites.set("dailymotion", dailymotion);
