// Doc: https://docs.picarto.tv/api/
const picarto_tv = {
	"title": "Picarto.Tv",
	"addStream_URLpatterns": new Map([
		["picarto_tv", [
			/^(?:http|https):\/\/picarto\.tv\/([^\/\?\&]+)/
		]]
	]),
	"API_addStream":
		function(source_website, id){
			return {
				url: `https://api.picarto.tv/v1/channel/name/${id}`,
				overrideMimeType: "application/json; charset=utf-8"
			};
		},
	"API":
		function(id){
			return {
				url: `https://api.picarto.tv/v1/channel/id/${id}`,
				overrideMimeType: "application/json; charset=utf-8"
			};
		},
	"checkResponseValidity":
		function(data){
			if(data.statusCode === 400 || data.statusCode === 403 || data.statusCode === 404){
				return `error (${data.statusCode})`;
			} else {
				return "success";
			}
		},
	"addStream_getId":
		function(source_website, id, response, streamListSetting, responseValidity){
			const data = response.json;
			if(responseValidity === "success"){
				return {
					streamId: data.user_id,
					streamName: data.name
				}
			}
			return null;
		},
	"checkLiveStatus":
		function(id, contentId, data, currentLiveStatus, currentChannelInfo){
			let streamData = currentLiveStatus;
			
			streamData.streamName = data["name"];
			streamData.streamStatus = data["title"];
			
			streamData.streamURL = `https://picarto.tv/${data["name"]}`;

			streamData.streamOwnerLogo = `https://picarto.tv/user_data/usrimg/${data["name"].toLowerCase()}/dsdefault.jpg`;

			streamData.streamCurrentViewers = parseInt(data["viewers"]);
			
			streamData.liveStatus.API_Status = data["online"];
			return streamData;
		}
};
websites.set("picarto_tv", picarto_tv);
