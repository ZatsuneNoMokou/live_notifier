class Queue {
	constructor(limit=4){
		this.queue = new Map();
		this.limit = limit;
	}
	
	enqueue(callback, id, ...args){
		this.queue.set(id, {callback, args});
		return this;
	}
	
	run(itemOnBegin=()=>{}, itemOnEnd=()=>{}){
		return new Promise((resolve, reject) => {
			let result = new Map();
			let currentlyExecuting = 0;
			let queueIter = this.queue.entries();
			
			let next = ()=>{
				let queueItem = queueIter.next();
				
				if(queueItem.done){
					return false;
				} else {
					let id= queueItem.value[0],
						item= queueItem.value[1];
					
					currentlyExecuting++;
					
					execItem(queueItem).then((data)=>{
						itemDone(queueItem, data);
					}).catch((err)=>{
						itemDone(queueItem, err);
					});
					
					return true;
				}
			}
			
			let itemDone = (queueItem, data)=>{
				currentlyExecuting--;
				let id= queueItem.value[0],
					item= queueItem.value[1];
				
				result.set(id, data);
				
				try{
					itemOnEnd(id, data, item.args);
				}
				catch(err){
					console.error(err);
				}
				
				if(!next() && currentlyExecuting == 0){
					resolve(result);
				}
			}
			
			let execItem = (queueItem)=>{
				return new Promise((resolve, reject)=>{
					let id= queueItem.value[0],
						item= queueItem.value[1];
					
					try{
						itemOnBegin(id, item.args);
					}
					catch(err){
						console.error(err);
					}
					
					let callback_result = item.callback(...item.args);
					if(callback_result instanceof Promise){
						callback_result.then((data)=>{
							resolve(data);
						}).catch((err)=>{
							reject(err);
						})
					} else {
						resolve(callback_result);
					}
				});
			}
			
			
			if(typeof this.limit == "number" && this.limit > 0){
				for(let i=1;i<=this.limit;i++){
					if(!next()) break;
				}
			} else {
				let queueItem = next();
				while(queueItem){
					queueItem = next();
				}
			}
		})
	}
}
