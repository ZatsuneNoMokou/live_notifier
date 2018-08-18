const ZTimer_ALARM_PREFIX = 'ZTimer_',
	ZTimer_ALARMS = new Map(),
	ZTimer_ON_ALARM = function (alarm) {
		if (ZTimer_ALARMS.has(alarm.name) && alarm.name.indexOf(ZTimer_ALARM_PREFIX) !== -1) {
			const zTimer = ZTimer_ALARMS.get(alarm.name);

			if (typeof zTimer.onTrigger === "function") {
				zTimer.onTrigger.call(zTimer, alarm);
			}
		}
	}
;





class ZTimer {
	/**
	 *
	 * @param {String} name
	 * @param {Boolean} repeat
	 * @param {Function} onTrigger
	 * @param {Number} duration
	 * @param {moment.unitOfTime=ms} type
	 */
	constructor(name, repeat, onTrigger, duration, type='ms'){
		if(name===''){
			throw 'InvalidName';
		}

		if(typeof name !== 'string' || typeof repeat !== 'boolean' || typeof duration !== 'number'){
			throw 'ArgumentTypeError';
		}



		Object.defineProperty(this, "name", {
			value: name,
			configurable: false,
			writable: false
		});
		Object.defineProperty(this, "repeat", {
			value: repeat,
			configurable: false,
			writable: false
		});
		Object.defineProperty(this, "onTrigger", {
			value: onTrigger,
			configurable: false,
			writable: false
		});

		this.duration = duration;
		this.durationType = type;

		this.fallbackTimer = null;
		this.chromeTimer = null;



		this.init()
			.catch(console.error)
		;
	}


	/**
	 * Init or reset the timer
	 * @return {Promise<void>}
	 */
	async init(){
		await this.clear()
			.catch(console.error)
		;



		/*
		 * browser.alarms need the proper chrome permission to be used
		 * browser.alarms.create "delayInMinutes" and "when" can not be < 1
		 */
		if(browser.hasOwnProperty('alarms') === false || ZTimer.getDurationInMinutes(this.duration, this.durationType) < 1){
			const ms = ZTimer.getDurationInMilliseconds(this.duration, this.durationType),
				zTimer = this
			;

			if(this.repeat===false){
				this.fallbackTimer = setTimeout(()=>{
					this.onTrigger.call(zTimer);
				}, ms)
			} else {
				this.fallbackTimer = setInterval(()=>{
					this.onTrigger.call(zTimer);
				}, ms)
			}
		} else {
			if(browser.alarms.onAlarm.hasListener(ZTimer_ON_ALARM) === false){
				browser.alarms.onAlarm.addListener(ZTimer_ON_ALARM);
			}

			const opts = {
				'when': ZTimer.getEndDate(this.duration, this.durationType).getTime()
			};

			if(this.repeat === true){
				opts.periodInMinutes = ZTimer.getDurationInMinutes(this.duration, this.durationType);
			}

			this.chromeTimer = ZTimer_ALARM_PREFIX + this.name;

			await browser.alarms.clear(this.chromeTimer);

			browser.alarms.create(this.chromeTimer, opts);
		}
		ZTimer_ALARMS.set(ZTimer_ALARM_PREFIX + this.name, this);
	}





	/**
	 *
	 * @param {Number} duration
	 * @param {moment.unitOfTime=ms} type
	 * @return {Date}
	 */
	static getEndDate(duration, type='ms'){
		return moment().add(duration, type).toDate();
	}

	/**
	 *
	 * @param {Number} duration
	 * @param {moment.unitOfTime=ms} type
	 * @return {number}
	 */
	static getDurationInMinutes(duration, type='ms'){
		let opt = {};
		opt[type] = duration;

		return moment.duration(opt).asMinutes();
	}

	/**
	 *
	 * @param {Number} duration
	 * @param {moment.unitOfTime=ms} type
	 * @return {number}
	 */
	static getDurationInMilliseconds(duration, type='ms'){
		let opt = {};
		opt[type] = duration;

		return moment.duration(opt).asMilliseconds();
	}





	/**
	 *
	 * @param {String} name
	 * @param {Number} duration
	 * @param {moment.unitOfTime=ms} type
	 * @return {Promise<void|Object>}
	 */
	static setTimeout(name, duration, type='ms'){
		return new Promise(resolve => {
			new ZTimer(name, false, resolve, duration, type);
		})
	}

	/**
	 *
	 * @param {String} name
	 * @param {Number} duration
	 * @param {moment.unitOfTime} type
	 * @param {Function} onTrigger
	 * @return {ZTimer}
	 */
	static setInterval(name, duration, type, onTrigger){
		return new ZTimer(name, true, onTrigger, duration, type);
	}


	/**
	 * Return true if successfully cleared
	 * @return {Promise<boolean>}
	 */
	async clear(){
		if(this.fallbackTimer!==null){
			if(this.repeat===false){
				clearTimeout(this.fallbackTimer);
			} else {
				clearInterval(this.fallbackTimer);
			}

			return true;
		}

		if(this.chromeTimer!==null){
			const cleared = await browser.alarms.clear(this.chromeTimer);

			if(cleared===true){
				ZTimer_ALARMS.delete(this.chromeTimer);
			}

			return cleared;
		}
	}

	/**
	 * Clear the ZTimer with the indicated name
	 * @param name
	 * @return {Promise<boolean>}
	 */
	static async clear(name){
		if(ZTimer_ALARMS.has(ZTimer_ALARM_PREFIX + name)){
			return await ZTimer_ALARMS.get(ZTimer_ALARM_PREFIX + name).clear();
		}
	}
}