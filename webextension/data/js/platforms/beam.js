let beam = {
	"title": "Beam",
	"addStream_URLpatterns": new Map([
		["beam", [
			/^(?:http|https):\/\/beam\.pro\/([^\/\?\&]+)/
		]]
	]),
	"API_addStream":
		function(source_website, id){
			return beam.API(id);
		},
	"API":
		function(id){
			let obj = {
				url: `https://beam.pro/api/v1/channels/${id}`,
				overrideMimeType: "text/plain; charset=utf-8"
			}
			return obj;
		},
	"importAPIGetUserId":
		function(id){
			let obj = {
				url: `https://beam.pro/api/v1/channels/${id}`,
				overrideMimeType: "text/plain; charset=utf-8"
			}
			return obj;
		},
	"importAPI":
		function(id){
			let obj = {
				url: `https://beam.pro/api/v1/users/${id}/follows?fields=id,token`,
				overrideMimeType: "text/plain; charset=utf-8"
			}
			return obj;
		},
	"checkResponseValidity":
		function(data){
			if(data == "Channel not found." || data.statusCode == 404){
				return "error";
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
			
			streamData.streamName = data.user["username"];
			streamData.streamStatus = data["name"];
			
			if(typeof data.user["avatarUrl"] == "string" && data.user["avatarUrl"] != ""){
				streamData.streamOwnerLogo = data["user"]["avatarUrl"];
			}
			streamData.streamCurrentViewers = parseInt(data["viewersCurrent"]);
			if(typeof data.user.social["twitter"] == "string" && data.user.social["twitter"] != "" && twitterID_from_url.test(data.user.social["twitter"])){
				streamData.twitterID = twitterID_from_url.exec(data.user.social["twitter"])[1];
			}
			
			streamData.liveStatus.API_Status = data["online"];
			return streamData;
		},
	"importGetUserId":
		function(data){
			return data.user.id;
		},
	"importStreamWebsites":
		function(id, data, streamListSetting){
			let obj = {
				list: []
			}
			
			if(typeof data == "object"){
				for(let item of data){
					obj.list.push(item["token"]);
				}
			}
			return obj;
		}
}
websites.set("beam", beam);
