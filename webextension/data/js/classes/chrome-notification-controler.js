class ChromeNotificationControler{
	constructor(){
		this.chromeAPI_button_availability = true;
		const chromeNotifications = this.chromeNotifications = new Map();

		browser.notifications.onClicked.addListener(function(notificationId){
			if(chromeNotifications.has(notificationId) && typeof chromeNotifications.get(notificationId) === "function"){
				chromeNotifications.get(notificationId)("onClicked");
			}
		});
		if(browser.notifications.onButtonClicked){
			browser.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex){
				if(chromeNotifications.has(notificationId) && typeof chromeNotifications.get(notificationId) === "function"){
					chromeNotifications.get(notificationId)("onButtonClicked", buttonIndex);
				}
			});
		}
		/*browser.notifications.onClosed.addListener(notificationId=>{
			console.log("closed: " + notificationId);
		});*/
	}

	send(options=null){
		const sendNotification = (options)=>{
			return new Promise((resolve, reject)=>{
				const onError = (error)=>{
					if(error && typeof error.message === "string" && (error.message === "Adding buttons to notifications is not supported." || error.message.indexOf("\"buttons\"") !== -1)){
						this.chromeAPI_button_availability = false;
						consoleMsg("log", "Buttons not supported, retrying notification without them.");
						if(options.buttons){
							delete options.buttons;
						}

						browser.notifications.create(options)
							.then(resolve)
							.catch(onError)
					} else {
						reject(error);
					}
				};
				try{
					browser.notifications.create(options)
						.then(resolve)
						.catch(onError)
				}
				catch(err){
					onError(err);
				}
			})
		};
		return new Promise((resolve, reject)=>{
			if(typeof options !== "object" || options === null){
				reject("Missing argument");
			}
			if(!options.type || typeof options.type !== "string"){
				options.type = "basic";
			}
			if(!options.contextMessage || typeof options.contextMessage !== "string"){
				options.contextMessage = browser.runtime.getManifest().name;
			}
			if(!options.isClickable || typeof options.isClickable !== "boolean"){
				options.isClickable = true;
			}
			if(!this.chromeAPI_button_availability && options.buttons){
				delete options.buttons;
			}

			sendNotification(options)
				.then(notificationId=>{
					//console.log(`Successfully created notification "${notificationId}"`);
					let timeout = setTimeout(()=>{
						if(this.chromeNotifications.has(notificationId)){
							this.chromeNotifications.delete(notificationId);
							reject("timedout");
						}
					}, 60 * 1000);
					this.chromeNotifications.set(notificationId, (triggeredType, buttonIndex=null)=>{
						//console.log(`${triggeredType} from notification "${notificationId}"`);
						clearTimeout(timeout);

						browser.notifications.clear(notificationId);
						// 0 is the first button, used as button of action
						if((!this.chromeAPI_button_availability && buttonIndex===null) || typeof buttonIndex==="number"){
							resolve({
								"triggeredType": triggeredType,
								"notificationId": notificationId,
								"buttonIndex": buttonIndex
							});
						} else {
							reject({
								"triggeredType": triggeredType,
								"notificationId": notificationId,
								"buttonIndex": buttonIndex
							});
						}
					})
				})
				.catch(reject)
			;
		});
	};
}