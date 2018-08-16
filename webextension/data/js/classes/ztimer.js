const ZTimer_ALARM_PREFIX = 'ZTimer_',
	ZTimer_ALARMS = new Map(),
	ZTimer_ON_ALARM = function (alarm) {
		if (ZTimer_ALARMS.has(alarm.name) && alarm.name.indexOf(ZTimer_ALARM_PREFIX) !== -1) {
			const zTimer = ZTimer_ALARMS.get(alarm.name);

			if (typeof zTimer.onTrigger === "function") {
				zTimer.onTrigger(alarm);
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
		this.fallbackTimer = null;
		this.chromeTimer = null;



		// browser.alarm.create "delayInMinutes" and "when" can not be < 1
		if(ZTimer.getDurationInMinutes(duration, type)<1){
			const ms = ZTimer.getDurationInMilliseconds(duration, type);

			if(repeat===false){
				this.fallbackTimer = setTimeout(()=>{
					this.onTrigger();
				}, ms)
			} else {
				this.fallbackTimer = setInterval(()=>{
					this.onTrigger();
				}, ms)
			}
		} else {
			if(browser.hasOwnProperty('alarms') === false){
				throw 'browser.alarm does not exist, check permissions';
			}

			if(browser.alarms.onAlarm.hasListener(ZTimer_ON_ALARM) === false){
				browser.alarms.onAlarm.addListener(ZTimer_ON_ALARM);
			}

			const opts = {
				'when': ZTimer.getEndDate(duration, type).getTime()
			};

			if(repeat === true){
				opts.periodInMinutes = ZTimer.getDurationInMinutes(duration, type);
			}

			this.chromeTimer = ZTimer_ALARM_PREFIX + this.name;

			browser.alarms.clear(this.chromeTimer)
				.then(()=>{
					browser.alarms.create(this.chromeTimer, opts);
				})
			;
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
	 * @return {Promise<>}
	 */
	static setTimeout(name, duration, type='ms'){
		return new Promise(resolve => {
			new ZTimer(name, false, resolve, duration, type);
		})
	}

	/**
	 *
	 * @param {String} name
	 * @param {Function} onTrigger
	 * @param {Number} duration
	 * @param {moment.unitOfTime=ms} type
	 * @return {ZTimer}
	 */
	static setInterval(name, onTrigger, duration, type='ms'){
		return new ZTimer(name, true, onTrigger, duration, type);
	}



	clear(){
		if(this.fallbackTimer!==null){
			if(this.repeat===false){
				clearTimeout(this.fallbackTimer);
			} else {
				clearInterval(this.fallbackTimer);
			}
		}

		if(this.chromeTimer!==null){
			browser.alarms.clear(this.chromeTimer);
			ZTimer_ALARMS.delete(this.chromeTimer);
		}
	}

	static clear(name){
		if(ZTimer_ALARMS.has(ZTimer_ALARM_PREFIX + name)){
			ZTimer_ALARMS.get(ZTimer_ALARM_PREFIX + name).clear();
		}
	}
}