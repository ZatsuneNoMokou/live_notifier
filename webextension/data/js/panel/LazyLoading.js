class LazyLoading {
	/*
	 * From https://toddmotto.com/echo-js-simple-javascript-image-lazy-loading/
	 * Changed:
	 * - To turn it into ECMA6
	 * - Use my custom image loader
	 * - Load picture a bit under the current screen
	 * - Debounce on the scroll event
	 */
	constructor() {
		this.store = new Map();

		document.querySelector("#streamList").addEventListener("scroll", _.debounce(()=>{
			this.checkPictures();
		}), 20, {
			maxWait: 60
		});
	}



	updateStore() {
		const lazyImgs = document.querySelectorAll(".item-stream .streamPicture img[data-src]");
		for (let i in lazyImgs) {
			if (lazyImgs.hasOwnProperty(i) && typeof lazyImgs[i].dataset.src === "string") {
				this.store.set(lazyImgs[i], lazyImgs[i].dataset.src);
				delete lazyImgs[i].dataset.src;
			}
		}
		this.checkPictures();
	}



	checkPictures() {
		this.store.forEach((src,node) => {
			const coords = node.getBoundingClientRect();
			if ((coords.top >= 0 && coords.left >= 0 && coords.top) <= 50 + (window.innerHeight || document.documentElement.clientHeight)) {
				node.src = src;
				node.parentNode.classList.remove("hide");
				node.parentNode.parentNode.classList.add("streamLogo");


				this.store.delete(node);
			}
		});
	}
}