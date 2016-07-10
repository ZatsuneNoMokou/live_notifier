'use strict';

var options = {
	"stream_keys_list": {
		"title": "Stream keys to notify",
		"description": "Stream list in a comma separated list.",
		"type": "string",
		"stringTextArea": true,
		"value": "",
		"showPrefInPanel": false
	},
	/*			Dailymotion			*/
	"dailymotion_user_id": {
		"title": "Your Dailymotion id",
		"description": "Enter your Dailymotion id to be able to import the stream(s) you follow.",
		"type": "string",
		"value": "",
		"group": "dailymotion"
	},
	"dailymotion_import": {
		"title": "Import the Dailymotion stream(s) you follow",
		"label": "Import",
		"type": "control",
		"group": "dailymotion"
	},
	/*			Hitbox			*/
	"hitbox_user_id": {
		"title": "Your Hitbox id",
		"description": "Enter your Hitbox id to be able to import the stream(s) you follow.",
		"type": "string",
		"value": "",
		"group": "hitbox"
	},
	"hitbox_import": {
		"title": "Import the Hitbox stream(s) you follow",
		"label": "Import",
		"type": "control",
		"group": "hitbox"
	},
	/*			Twitch			*/
	"twitch_user_id": {
		"title": "Your Twitch id",
		"description": "Enter your Twitch id to be able to import the stream(s) you follow.",
		"type": "string",
		"value": "",
		"group": "twitch"
	},
	"twitch_import": {
		"title": "Import the Twitch stream(s) you follow.",
		"label": "Import",
		"type": "control",
		"group": "twitch"
	},
	/*			Beam			*/
	"beam_keys_list": {
		"title": "Beam keys to notify",
		"description": "Stream list in a comma separated list.",
		"type": "hidden",
		"value": "",
		"showPrefInPanel": false,
		"group": "beam"
	},
	"beam_user_id": {
		"title": "Your Beam id",
		"description": "Enter your Beam id to be able to import the stream(s) you follow.",
		"type": "string",
		"value": "",
		"group": "beam"
	},
	"beam_import": {
		"title": "Import the Beam stream(s) you follow.",
		"label": "Import",
		"type": "control",
		"group": "beam"
	},
	/*			Notifications type			*/
	/*"notification_type": {
		"tittle": "Notification type",
		"description": "",
		"type": "menulist",
		"value": "chrome_api",
		"options": [
				{
					"value": "web",
					"label": "Web"
				},
				{
					"value": "chrome_api",
					"label": "Chrome API"
				}
			]
	},*/
	/*			Check delay			*/
	"check_delay": {
		"title": "Streams status delay",
		"description": "Delay between checks, in minute",
		"type": "integer",
		"value": 5
	},
	/*			Notifications			*/
	"notify_online": {
		"title": "Show a notification when a stream start",
		"description": "Notification when checked",
		"type": "bool",
		"value": true,
		"group": "notifications"
	},
	"notify_offline": {
		"title": "Show a notification when a stream finish",
		"description": "Notification when checked",
		"type": "bool",
		"value": false,
		"group": "notifications"
	},
	/*				Filters				*/
	"statusBlacklist":{
		"title": "Status blacklist",
		"type": "string",
		"stringList": true,
		"value": "",
		"group": "filters"
	},
	"statusWhitelist":{
		"title": "Status whitelist",
		"type": "string",
		"stringList": true,
		"value": "",
		"group": "filters"
	},
	"gameBlacklist":{
		"title": "Game blacklist",
		"type": "string",
		"stringList": true,
		"value": "",
		"group": "filters"
	},
	"gameWhitelist":{
		"title": "Game whitelist",
		"type": "string",
		"stringList": true,
		"value": "",
		"group": "filters"
	},
	/*			Show in panel			*/
	"group_streams_by_websites": {
		"title": "Group streams by website",
		"description": "Grouped when checked",
		"type": "bool",
		"value": true,
		"group": "showInPanel"
	},
	"show_offline_in_panel": {
		"title": "Show offline streams in the panel",
		"description": "Shown when checked",
		"type": "bool",
		"value": true,
		"group": "showInPanel"
	},
	/*			Confirm add / delete			*/
	"confirm_addStreamFromPanel": {
		"title": "Confirmation to add streams",
		"description": "Show a notification to confirm when adding a stream of config (from panel)",
		"type": "bool",
		"value": false,
		"group": "confirmAddDelete"
	},
	"confirm_deleteStreamFromPanel": {
		"title": "Confirmation to delete streams",
		"description": "Show a notification to confirm when deleting a stream of config (from panel)",
		"type": "bool",
		"value": true,
		"group": "confirmAddDelete"
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
		"group": "theme"
	},
	"background_color": {
		"title": "Panel background color",
		"description": "Choose background color",
		"type": "color",
		"value": "#000000",
		"group": "theme"
	},
	/*			Import/Export Prefs			*/
	"export_preferences": {
		"title": "Export preferences from a file",
		"label": "Export preferences",
		"type": "control",
		"group": "importexport_prefs"
	},
	"import_preferences": {
		"title": "Import preferences from a file",
		"label": "Import preferences",
		"type": "control",
		"group": "importexport_prefs"
	},
	/*			Livestreamer			*/
	"livestreamer_cmd_to_clipboard": {
		"title": "Copy Livestreamer command on stream click.",
		"description": "Check to activate",
		"type": "bool",
		"value": false,
		"group": "livestreamer"
	},
	"livestreamer_cmd_quality": {
		"title": "Livestreamer quality",
		"description": "More information on Livestreamer page.",
		"type": "string",
		"value": "best",
		"group": "livestreamer"
	}
}

var options_default = {};
var options_default_sync = {};

for(var id in options){
	var option = options[id];
	if(typeof option.value != "undefined"){
		options_default[id] = option.value;
		
		if(!(typeof option.sync == "boolean" && option.sync == false)){
			options_default_sync[id] = option.value;
		}
	}
}

