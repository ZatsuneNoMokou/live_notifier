'use strict';

var optionsData = {};
optionsData.options = {
	"stream_keys_list": {
		"title": "Stream keys to notify",
		"description": "Stream list in a comma separated list.",
		"type": "string",
		"stringTextArea": true,
		"value": "",
		"showPrefInPanel": false,
		"prefLevel": "experimented"
	},
	/*			Dailymotion			*/
	"dailymotion_user_id": {
		"title": "Your Dailymotion id",
		"description": "Enter your Dailymotion id to be able to import the stream(s) you follow.",
		"type": "string",
		"value": "",
		"group": "dailymotion",
		"prefLevel": "advanced"
	},
	"dailymotion_import": {
		"title": "Import the Dailymotion stream(s) you follow",
		"label": "Import",
		"type": "control",
		"group": "dailymotion",
		"prefLevel": "advanced"
	},
	/*			Hitbox			*/
	"hitbox_user_id": {
		"title": "Your Hitbox id",
		"description": "Enter your Hitbox id to be able to import the stream(s) you follow.",
		"type": "string",
		"value": "",
		"group": "hitbox",
		"prefLevel": "advanced"
	},
	"hitbox_import": {
		"title": "Import the Hitbox stream(s) you follow",
		"label": "Import",
		"type": "control",
		"group": "hitbox",
		"prefLevel": "advanced"
	},
	/*			Twitch			*/
	"twitch_user_id": {
		"title": "Your Twitch id",
		"description": "Enter your Twitch id to be able to import the stream(s) you follow.",
		"type": "string",
		"value": "",
		"group": "twitch",
		"prefLevel": "advanced"
	},
	"twitch_import": {
		"title": "Import the Twitch stream(s) you follow.",
		"label": "Import",
		"type": "control",
		"group": "twitch",
		"prefLevel": "advanced"
	},
	/*			Beam			*/
	"beam_user_id": {
		"title": "Your Beam id",
		"description": "Enter your Beam id to be able to import the stream(s) you follow.",
		"type": "string",
		"value": "",
		"group": "beam",
		"prefLevel": "advanced"
	},
	"beam_import": {
		"title": "Import the Beam stream(s) you follow.",
		"label": "Import",
		"type": "control",
		"group": "beam",
		"prefLevel": "advanced"
	},
	/*			Youtube			*/
	"youtube_api_key": {
		"type": "string",
		"value": "",
		"group": "youtube",
		"prefLevel": "experimented"
	},
	"youtube_api_referrer":  {
		"type": "string",
		"value": "",
		"group": "youtube",
		"prefLevel": "experimented"
	},
	/*			Check delay			*/
	"check_delay": {
		"title": "Streams status delay",
		"description": "Delay between checks, in minute",
		"type": "integer",
		"value": 5,
		"minValue": 1,
		"prefLevel": "advanced"
	},
	"timeout_delay": {
		"title": "Streams timeout delay",
		"description": "Timeout delay of requests, in sec (between 10 and 30)",
		"type": "integer",
		"value": 30,
		"minValue": 10,
		"maxValue": 30,
		"prefLevel": "experimented"
	},
	/*			Notifications			*/
	"notify_online": {
		"title": "Show a notification when a stream start",
		"description": "Notification when checked",
		"type": "bool",
		"value": true,
		"group": "notifications",
		"prefLevel": "basic"
	},
	"notify_vocal_online": {
		"title": "Read a vocal notification when a stream start",
		"description": "Notification when checked",
		"type": "bool",
		"value": false,
		"group": "notifications",
		"prefLevel": "basic"
	},
	"notify_offline": {
		"title": "Show a notification when a stream finish",
		"description": "Notification when checked",
		"type": "bool",
		"value": false,
		"group": "notifications",
		"prefLevel": "basic"
	},
	"notify_vocal_offline": {
		"title": "Read a vocal notification when a stream finish",
		"description": "Notification when checked",
		"type": "bool",
		"value": false,
		"group": "notifications",
		"prefLevel": "basic"
	},
	/*				Filters				*/
	"statusBlacklist":{
		"title": "Status blacklist",
		"type": "string",
		"stringList": true,
		"value": "",
		"group": "filters",
		"prefLevel": "advanced"
	},
	"statusWhitelist":{
		"title": "Status whitelist",
		"type": "string",
		"stringList": true,
		"value": "",
		"group": "filters",
		"prefLevel": "advanced"
	},
	"gameBlacklist":{
		"title": "Game blacklist",
		"type": "string",
		"stringList": true,
		"value": "",
		"group": "filters",
		"prefLevel": "advanced"
	},
	"gameWhitelist":{
		"title": "Game whitelist",
		"type": "string",
		"stringList": true,
		"value": "",
		"group": "filters",
		"prefLevel": "advanced"
	},
	/*			Show in panel			*/
	"group_streams_by_websites": {
		"title": "Group streams by website",
		"description": "Grouped when checked",
		"type": "bool",
		"value": true,
		"group": "showInPanel",
		"prefLevel": "basic"
	},
	"show_offline_in_panel": {
		"title": "Show offline streams in the panel",
		"description": "Shown when checked",
		"type": "bool",
		"value": true,
		"group": "showInPanel",
		"prefLevel": "basic"
	},
	/*			Confirm add / delete			*/
	"confirm_addStreamFromPanel": {
		"title": "Confirmation to add streams",
		"description": "Show a notification to confirm when adding a stream of config (from panel)",
		"type": "bool",
		"value": false,
		"group": "confirmAddDelete",
		"prefLevel": "basic"
	},
	"confirm_deleteStreamFromPanel": {
		"title": "Confirmation to delete streams",
		"description": "Show a notification to confirm when deleting a stream of config (from panel)",
		"type": "bool",
		"value": true,
		"group": "confirmAddDelete",
		"prefLevel": "basic"
	},
	/*			Theme			*/
	"panel_theme": {
		"title": "Panel theme",
		"description": "Choose the panel of the panel",
		"type": "menulist",
		"value": "dark",
		"options": [
				{
					"value": "dark",
					"label": "Dark"
				},
				{
					"value": "light",
					"label": "Light"
				}
			],
		"group": "theme",
		"prefLevel": "basic"
	},
	"background_color": {
		"title": "Panel background color",
		"description": "Choose background color",
		"type": "color",
		"value": "#000000",
		"group": "theme",
		"prefLevel": "basic"
	},
	/*			Import/Export Prefs			*/
	"export_preferences": {
		"title": "Export preferences from a file",
		"label": "Export preferences",
		"type": "control",
		"group": "importexport_prefs",
		"prefLevel": "basic"
	},
	"import_preferences": {
		"title": "Import preferences from a file",
		"label": "Import preferences",
		"type": "control",
		"group": "importexport_prefs",
		"prefLevel": "basic"
	},
	/*			Settings level			*/
	"showAdvanced": {
		"title": "Show advanced settings",
		"description": "Enabled when checked",
		"type": "bool",
		"value": false,
		"group": "settingsLevel",
		"prefLevel": "basic"
	},
	"showExperimented": {
		"title": "Show setting for experimented users",
		"description": "Enabled when checked",
		"type": "bool",
		"value": false,
		"group": "settingsLevel",
		"showPrefInPanel": false,
		"prefLevel": "advanced"
	}
}

optionsData.options_default = {};
optionsData.options_default_sync = {};

for(var id in optionsData.options){
	var option = optionsData.options[id];
	if(typeof option.value != "undefined"){
		optionsData.options_default[id] = option.value;
		
		if(!(typeof option.sync == "boolean" && option.sync == false)){
			optionsData.options_default_sync[id] = option.value;
		}
	}
}
