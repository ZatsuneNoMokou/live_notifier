let embed_selectors = ['iframe[src*="://www.dailymotion.com/embed/video/"]', 'iframe[src*="://www.hitbox.tv/"]', 'iframe[src*="://player.twitch.tv/?channel"]'];
let embed_list = new Array();
for(selector of embed_selectors){
	let result = document.querySelectorAll(selector);
	if(result.length > 0){
		for(node of result){
			embed_list.push(node.src);
		}
	}
}
self.port.emit("addStream", embed_list);