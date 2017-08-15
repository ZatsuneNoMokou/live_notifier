const smashcast = {
	"title": "Smashcast",
	"addStream_URLpatterns": new Map([
		["smashcast", [
			/^(?:http|https):\/\/www\.smashcast\.tv\/(?:embedchat\/)?([^\/\?\&]+).*$/
		]]
	]),
	"API_addStream":
		function(source_website, id){
			return smashcast.API(id);
		},
	"API":
		function(id){
			return {
				url: `https://api.smashcast.tv/media/live/${id}`,
				overrideMimeType: "text/plain; charset=utf-8"
			};
		},
	"importAPI":
		function(id){
			return {
				url: `https://api.smashcast.tv/following/user?user_name=${id}`,
				overrideMimeType: "text/plain; charset=utf-8"
			};
		},
	"checkResponseValidity":
		function(data){
			if(data.error === "live"){
				return "error";
			}
			if(data.error === true){
				return (data.hasOwnProperty("error_msg") === true)? data.error_msg : "error";
			}
			if(data.hasOwnProperty("livestream") === false){
				return "data missing";
			}
			return "success";
		},
	"addStream_getId":
		function(source_website, id, response, streamListSetting, responseValidity){
			const data = response.json;
			if(responseValidity === "success"){
				return {
					streamId: id,
					streamName: (data.hasOwnProperty("media_user_name"))? data["media_user_name"] : id
				};
			}
			return null;
		},
	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus, currentChannelInfo){
			let streamData = currentLiveStatus;
			if(data.hasOwnProperty("livestream") === false){
				return null;
			}
			if(typeof data["livestream"][0] === "object"){
				data = data["livestream"][0];
				streamData.streamName = data["media_user_name"];
				streamData.streamStatus = data["media_status"];
				if(typeof data["category_name"] === "string" && data["category_name"] !== ""){
					streamData.streamGame = data["category_name"];
				}
				if(data["category_logo_large"] !== null){
					streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_large"];
				} else if(data["category_logo_small"] !== null){
					streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_small"];
				} else {
					streamData.streamCategoryLogo = "";
				}
				if(streamData.streamCategoryLogo === "http://edge.sf.hitbox.tv/static/img/generic/blank.gif"){
					streamData.streamCategoryLogo = "";
				}
				
				if(typeof data.channel["user_logo"] === "string" && data.channel["user_logo"].indexOf("/static/img/generic/default-user-") === -1){
					streamData.streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo"];
				} else if(typeof data.channel["user_logo"] !== "string" && data.channel["user_logo"].indexOf("/static/img/generic/default-user-") === -1){
					streamData.streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo_small"];
				} else {
					streamData.streamOwnerLogo = "";
				}
				if(typeof data.channel["channel_link"] === "string" && data.channel["channel_link"] !== ""){
					streamData.streamURL = data.channel["channel_link"];
				}
				streamData.streamCurrentViewers = parseInt(data["media_views"]);
				
				streamData.liveStatus.API_Status = (data["media_is_live"] === "1");
				if(typeof data.channel["twitter_account"] === "string" && data.channel["twitter_account"] !== "" && typeof data.channel["twitter_account"] === "string" && data.channel["twitter_enabled"] === "1"){
					streamData.twitterID = data.channel["twitter_account"];
				}
				return streamData;
			} else {
				return null;
			}
		},
	"importStreamWebsites":
		function(id, data, streamListSetting, pageNumber){
			let obj = {
				list: []
			};
			
			if(typeof data.following === "object"){
				for(let item of data.following){
					obj.list.push(item["user_name"]);
				}
				
				if(data.following.length > 0){
					const nextPageNumber = ((typeof pageNumber === "number")? pageNumber : 1) + 1,
						nextUrl = smashcast.importAPI(id).url + "&offset=" + nextPageNumber;
					obj.next = {"url": nextUrl, "pageNumber": nextPageNumber};
				} else {
					obj.next = null;
				}
			}
			
			return obj;
		}
};
websites.set("smashcast", smashcast);
