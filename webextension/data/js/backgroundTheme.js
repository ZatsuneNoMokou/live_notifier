'use strict';

//var backgroundPage = chrome.extension.getBackgroundPage();
//var getPreference = backgroundPage.getPreference;

class color{
	constructor(hexColorCode){
		const getCodes =  /^#([\da-fA-F]{2,2})([\da-fA-F]{2,2})([\da-fA-F]{2,2})$/;
		if(getCodes.test(hexColorCode)){
			const result = getCodes.exec(hexColorCode);
			this.R= parseInt(result[1],16);
			this.G= parseInt(result[2],16);
			this.B= parseInt(result[3],16);
		}
	}

	rgbCode(){
		return "rgb(" + this.R + ", " + this.G + ", " + this.B + ")";
	}
	/* RGB to HSL function from https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion/9493060#9493060 */
	getHSL(){
		let r = this.R;let g = this.G;let b = this.B;
		
		r /= 255; g /= 255; b /= 255;
		let max = Math.max(r, g, b), min = Math.min(r, g, b);
		let h, s, l = (max + min) / 2;

		if(max == min){
			h = s = 0; // achromatic
		}else{
			let d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch(max){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		return {"H": h * 360, "S": s * 100 + "%", "L": l * 100 + "%"};
	}
}

let backgroundPage_theme_cache = null;
function theme_cache_update(colorStylesheetNode){
	const currentTheme = getPreference("panel_theme"),
		background_color = getPreference("background_color");
	
	if(backgroundPage_theme_cache !== null && colorStylesheetNode !== null && currentTheme === backgroundPage_theme_cache.dataset.theme && background_color === backgroundPage_theme_cache.dataset.background_color){
		if(colorStylesheetNode !== null && currentTheme === colorStylesheetNode.dataset.theme && background_color === colorStylesheetNode.dataset.background_color){
			console.info("Loaded theme is already good");
			return null;
		} else {
			console.info("Using background page theme cache");
			return backgroundPage_theme_cache.cloneNode(true);
		}
	} else {
		const baseColor = new color(background_color);
		if(typeof baseColor !== "object"){return null;}
		backgroundPage_theme_cache = document.createElement("style");
		backgroundPage_theme_cache.id = "generated-color-stylesheet";
		const baseColor_hsl = baseColor.getHSL(),
			baseColor_L = JSON.parse(baseColor_hsl.L.replace("%",""))/100;
		let values, textColor_stylesheet;
		if(currentTheme === "dark"){
			if(baseColor_L > 0.5 || baseColor_L < 0.1){
				values = ["19%","13%","26%","13%"];
			} else {
				values = [(baseColor_L + 0.06) * 100 + "%", baseColor_L * 100 + "%", (baseColor_L + 0.13) * 100 + "%", baseColor_L * 100 + "%"];
			}
		} else if(currentTheme === "light"){
			if(baseColor_L < 0.5 /*|| baseColor_L > 0.9*/){
				values = ["87%","74%","81%","87%"];
			} else {
				values = [baseColor_L * 100 + "%", (baseColor_L - 0.13) * 100 + "%", (baseColor_L - 0.06) * 100 + "%", baseColor_L * 100 + "%"];
			}
		}

		backgroundPage_theme_cache.textContent = Mustache.render(appGlobal.mustacheTemplates.get("backgroundTheme"), {
			"isDarkTheme": (currentTheme === "dark"),
			"isLightTheme": (currentTheme === "light"),
			"baseColor_hsl": baseColor_hsl,
			"light0": values[0],
			"light1": values[1],
			"light2": values[2],
			"light3": values[3]
		});
		backgroundPage_theme_cache.dataset.theme = currentTheme;
		backgroundPage_theme_cache.dataset.background_color = background_color;
		//console.log(baseColor.rgbCode());
		//console.log("hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + baseColor_hsl.L + ")");
		
		return backgroundPage_theme_cache.cloneNode(true);
	}
}

// Build theme cache on addon load
theme_cache_update(null);

var backgroundTheme = {"color": color, "theme_cache_update": theme_cache_update};
