'use strict';

var embed_selectors = ['iframe[src*="://www.dailymotion.com/embed/video/"]', 'iframe[src*="://www.hitbox.tv/"]', 'iframe[src*="://player.twitch.tv/?channel"]'];

var embed_list = new Array();
var message = {"embed_list": embed_list};
for(let i in embed_selectors){
	let selector = embed_selectors[i];
	let result = document.querySelectorAll(selector);
	if(result.length > 0){
		for(let j in result){
			let node = result[j];
			if(typeof node.src == "string" && node.src.length > 0){
				embed_list.push(node.src);
			}
		}
	}
}

function sendDataToMain(id, data){
	chrome.runtime.sendMessage({"sender": "Live_Notifier_Embed","receiver": "Live_Notifier_Main", "id": id, "data": data});
}

sendDataToMain("addStream", message);
