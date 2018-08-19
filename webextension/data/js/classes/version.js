const VERSION_NUMBERS_REG =  /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/;

class Version extends Array {
	constructor(str) {
		if (VERSION_NUMBERS_REG.test(str) === false) {
			// throw 'InvalidString';
			super();
		} else {
			const [, ...arr] = VERSION_NUMBERS_REG.exec(str);

			if (arr.length > 0) {
				if (arr.length === 4 && arr[3] === undefined) {
					arr.splice(3, 1);
				}

				arr.forEach((v, i)=>{
					arr[i] = parseInt(v);
				})
			}

			super();
			Array.prototype.push.apply(this, arr);
		}
	}

	toNumber(){
		let version = 0;

		if(this.length === 3 || this.length === 4){
			for(let i=0; i < this.length; i++){
				version += this[i] * Math.pow(10, 3 * (2 - i));
			}
		}

		return version;
	}
}
