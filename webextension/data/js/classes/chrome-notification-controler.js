class ChromeNotificationControler{
	constructor(){
		this.chromeAPI_button_availability = true;
		const chromeNotifications = this.chromeNotifications = new Map();

		browser.notifications.onClicked.addListener(function(notificationId){
			if(chromeNotifications.has(notificationId) && typeof chromeNotifications.get(notificationId).fn === "function"){
				chromeNotifications.get(notificationId).fn("onClicked");
			}
		});
		if(browser.notifications.onButtonClicked){
			browser.notifications.onButtonClicked.addListener((notificationId, buttonIndex)=>{
				if(chromeNotifications.has(notificationId) && typeof chromeNotifications.get(notificationId).fn === "function"){
					chromeNotifications.get(notificationId).fn("onButtonClicked", buttonIndex);
				}
			});
		}
		this.onShownSupported = browser.notifications.hasOwnProperty("onShown");
		if(this.onShownSupported===true){
			browser.notifications.onShown.addListener(notificationId=>{
				consoleMsg("info", `Notification "${notificationId}" shown.`);
				if(this.chromeNotifications.has(notificationId) && typeof this.chromeNotifications.get(notificationId).fnOnShown === "function"){
					this.chromeNotifications.get(notificationId).fnOnShown();
				}
			})
		}
		browser.notifications.onClosed.addListener((notificationId, byUser=false)=>{
			if(byUser===true && this.chromeNotifications.has(notificationId)){
				this.chromeNotifications.get(notificationId).isClosed = true;
			}
		});

		this.notificationCleaner = setInterval(()=>{
			browser.notifications.getAll()
				.then(activeNotifications=>{
					this.chromeNotifications.forEach((notifTimer, notificationId)=>{
						if(activeNotifications.hasOwnProperty(notificationId)===false){
							if(typeof chromeNotifications.get(notificationId).fn === "function"){
								chromeNotifications.get(notificationId).fn((chromeNotifications.get(notificationId).isClosed)? "closed" : "timeout");
							} else {
								console.warn(`${notifId} has timed out but data problem.`);
							}
						}
					});
				})
			;
		}, 10 * 1000);
	}

	/**
	 *
	 * @param options Options from chrome.notifications.NotificationOptions
	 * @param {Object=null} customOption
	 * @param {Object} customOption.soundObject
	 * @param {String} customOption.soundObject.data
	 * @param {Number} customOption.soundObjectVolume
	 * @return {Promise<Object>}
	 */
	send(options=null, customOption=null){
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
						;
					} else {
						reject(error);
					}
				};
				try{
					browser.notifications.create(options)
						.then(resolve)
						.catch(onError)
					;
				} catch(err){
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

			let sound = null;
			sendNotification(options)
				.then(notificationId=>{
					consoleMsg("info", `Notification "${notificationId}" created.`);
					if(customOption!==null && typeof customOption.soundObject==="object" && customOption.soundObject!==null && typeof customOption.soundObject.data==="string"){
						sound = new Audio(customOption.soundObject.data);
						sound.volume = customOption.soundObjectVolume / 100;
						if(this.onShownSupported===false){
							sound.play();
						}
					}

					this.chromeNotifications.set(notificationId, {
						"isClosed": false,
						"fn": (triggeredType, buttonIndex = null)=>{
							this.clear(notificationId);

							if(sound!==null){
								sound.currentTime = 0;
								sound.pause();
							}

							if (
								triggeredType === "timeout"
								||
								triggeredType === "closed"
								||
								(
									(this.chromeAPI_button_availability === true && typeof buttonIndex !== "number")
									||
									(this.chromeAPI_button_availability === false && buttonIndex !== null)
								)
							) {
								reject({
									"triggeredType": triggeredType,
									"notificationId": notificationId,
									"buttonIndex": buttonIndex
								});
							} else {
								// 0 is the first button, used as button of action
								resolve({
									"triggeredType": triggeredType,
									"notificationId": notificationId,
									"buttonIndex": buttonIndex
								});
							}
						},
						"fnOnShown": ()=>{
							if(sound!==null && this.onShownSupported===true){
								sound.play();
							}
						}
					});
				})
				.catch(error=>{
					if(sound!==null){
						sound.currentTime = 0;
						sound.pause();
					}
					reject(error);
				})
			;
		});
	};
	clear(notificationId=null){
		if(notificationId!==null && this.chromeNotifications.has(notificationId)){
			browser.notifications.clear(notificationId);
			this.chromeNotifications.delete(notificationId);
			return true;
		}
		return false;
	}
}