class Hook {
	constructor() {
		let i = -1;
		/*
		 * ++i To change the var before using it
		 * It is change anyway
		 */
		this.HOOK_TYPES = {
			'PRE_HOOK': ++i,
			'POST_HOOK': ++i,
			'DEFAULT': ++i,
			'LISTENER': ++i
		};

		/**
		 *
		 * @type {Map<String, Function[]>}
		 * @private
		 */
		this._hooks = new Map();

		/**
		 *
		 * @type {Map<String, Function>}
		 * @private
		 */
		this._hooksBindableListeners = new Map();
	}



	// noinspection JSMethodCanBeStatic
	/**
	 *
	 * @param anyVar
	 * @returns {boolean}
	 * @private
	 */
	_isNumber(anyVar) {
		return typeof anyVar === 'number' && !isNaN(anyVar);
	}

	// noinspection JSMethodCanBeStatic
	/**
	 *
	 * @param anyVar
	 * @returns {boolean}
	 * @private
	 */
	_isString(anyVar) {
		return typeof anyVar === 'string' && anyVar.length > 0;
	}

	/**
	 *
	 * @param {Number} hookType
	 * @param {String} hookName
	 * @param {Function} hookFn Arguments of the ...args of the runHook method
	 * @param {Boolean} isPost
	 * @returns {this}
	 * @private
	 */
	_addHook(hookType, hookName, hookFn, isPost=false) {
		if (this._isNumber(hookType) === false || this._isString(hookName) === false || typeof hookFn !== 'function' || typeof isPost !== 'boolean') {
			throw 'WrongArgumentType';
		}

		hookName = `${(isPost===false)? this.HOOK_TYPES.PRE_HOOK : this.HOOK_TYPES.POST_HOOK}/${this.HOOK_TYPES.DEFAULT}/${hookName}`;

		if (this._hooks.has(hookName) === false) {
			this._hooks.set(hookName, []);
		}

		this._hooks.get(hookName).push(hookFn);

		return this;
	}

	/**
	 *
	 * @param {Number} hookType
	 * @param {String} hookName
	 * @returns {boolean}
	 * @private
	 */
	_hasHook(hookType, hookName) {
		if (this._isNumber(hookType) === false || typeof hookName !== 'string') {
			throw 'ArgumentType';
		}

		hookName = `${hookType}/${hookName}`;

		return this._hooks.has(this.HOOK_TYPES.PRE_HOOK + '/' + hookName) || this._hooks.has(this.HOOK_TYPES.POST_HOOK + '/' + hookName)
	}





	/**
	 *
	 * @param {String} hookName
	 * @param {Function} hookFn
	 * @returns {this}
	 */
	addPreHook(hookName, hookFn) {
		return this._addHook(this.HOOK_TYPES.DEFAULT, hookName, hookFn, false);
	}

	/**
	 *
	 * @param {String} hookName
	 * @param {Function} hookFn
	 * @returns {this}
	 */
	addPostHook(hookName, hookFn) {
		return this._addHook(this.HOOK_TYPES.DEFAULT, hookName, hookFn, true);
	}

	/**
	 *
	 * @param {String} hookName
	 * @returns {boolean}
	 */
	hasHook(hookName) {
		return this._hasHook(this.HOOK_TYPES.DEFAULT, hookName)
	}



	/**
	 *
	 * @param {String} eventName
	 * @param {Function} listener
	 * @returns {this}
	 */
	addListener(eventName, listener) {
		return this._addHook(this.HOOK_TYPES.LISTENER, eventName, listener, false);
	}

	/**
	 *
	 * @param {String} eventName
	 * @returns {boolean}
	 */
	hasListener(eventName) {
		return this._hasHook(this.HOOK_TYPES.LISTENER, eventName);
	}

	/**
	 *
	 * @param {String} eventName
	 * @param {*} context
	 * @param {...*} args
	 * @returns {Promise<*>}
	 */
	emit(eventName, context=null, ...args) {
		return this.runHook(eventName, {
			'context': context,
			'hookType': this.HOOK_TYPES.LISTENER
		}, null, args);
	}

	/**
	 * A function that could be passed to a addEventListener-like function, making sure to only have one function per eventName
	 * @param {String} eventName
	 * @returns {Function}
	 */
	bindableListener(eventName) {
		if (this._hooksBindableListeners.has(eventName) === false) {
			const _this = this;
			this._hooksBindableListeners.set(eventName, function (...args) {
				_this.emit(eventName, this, args)
					.catch(console.error)
				;
			});
		}

		return this._hooksBindableListeners.get(eventName);
	}





	/**
	 *
	 * @param {String} hookName
	 * @param {Object} [opts]
	 * @property {boolean} opts.breakOnFalse
	 * @property {*} opts.context Context that will be use on the functions
	 * @param {Function} [fn]
	 * @param {...*} args
	 * @returns {Promise<*>}
	 */
	async runHook(hookName, opts={}, fn=null, ...args) {
		opts = Object.assign({
			'context': null,
			'breakOnFalse': false,
			'hookType': this.HOOK_TYPES.DEFAULT /* For internal use */
		}, opts);
		hookName = opts.hookType + '/' +  hookName;



		if (this._hooks.has(this.HOOK_TYPES.PRE_HOOK + '/' + hookName)) {
			const arr = this._hooks.get(this.HOOK_TYPES.PRE_HOOK + '/' + hookName);

			for(let i=0; i < arr.length; i++) {
				let result,
					err = null
				;

				try {
					result = await arr[i].apply(opts.context, args);
				} catch (e) {
					console.error(e);
					err = e;
				}

				if (err === null && result !== undefined) {
					if (Array.isArray(result)) {
						args = result;
					} else if (opts.breakOnFalse === true && result === false) {
						return false;
					} else {
						args = [result];
					}
				}
			}
		}



		let output;
		if (typeof fn === 'function') {
			try {
				output = fn.apply(opts.context, args);
			} catch (e) {
				console.error(e);
			}

			if (opts.breakOnFalse === true && output === false) {
				return false;
			}
		}



		if (this._hooks.has(this.HOOK_TYPES.POST_HOOK + '/' + hookName)) {
			const arr = await this._hooks.get(this.HOOK_TYPES.POST_HOOK + '/' + hookName);

			for(let i=0; i < arr.length; i++) {
				try {
					output = arr[i].apply(opts.context, args);
				} catch (e) {
					console.error(e);
				}

				if (opts.breakOnFalse === true && output === false) {
					return false;
				}
			}
		}

		return output;
	}
}
