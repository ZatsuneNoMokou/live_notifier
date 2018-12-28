# Firefox Web Extension Support
* /!\ Missing/Not working well on Firefox:
  * ~~Clipboard (Currently using a workaround, but [Bug 1272869 (RESOLVED FIXED)](https://bugzilla.mozilla.org/show_bug.cgi?id=1272869) )~~  (Fixed in Firefox 63)
  * Button on notifications (Using notification without them alike Opera) ( [Bug 1190681](https://bugzilla.mozilla.org/show_bug.cgi?id=1190681) )
  * Importing from file using the panel with Firefox Web Extensions ( [Bug 1292701](https://bugzilla.mozilla.org/show_bug.cgi?id=1292701) )
  * Sync support ([Bug 1311710](https://bugzilla.mozilla.org/show_bug.cgi?id=1311710) and ~~[Bug 1220494 (RESOLVED FIXED)](https://bugzilla.mozilla.org/show_bug.cgi?id=1220494)~~ )
  * Websites CSP applied to Content Scripts, and should not happen ([Bug 1267027](https://bugzilla.mozilla.org/show_bug.cgi?id=1267027))

# 12.0.0.15
* Fix : Spelling in french
* Fix : Option page, due to domDelegate update
* Fix : Dropbox deprecation message
* \- : Deleted ability to hide/ignore streams
* \- : Deleted settings of settings a custom url for streams
* \- : Remove display of settings from the panel, button now open settings directly

# 12.0.0.14
* i : Dependencies update
* Fix : Dropbox Sync for live list
* Fix : Change from hotfix 11.16.3

# 12.0.0.12 - 12.0.0.13
* Fix : Dropbox Sync on Firefox (Date comparaison)

# 12.0.0.11
* \+ : Dropbox Sync
	* Default client id
	* Better storage of auth token

# 12.0.0.10
* \+ : Back with YouTube API with Patreon password
* Fix : \[ZDK] - Export preferences to file - Timeout too short
* Fix : \[ZDK] Use lodash deep clone as [Object.assign()](https://developer.mozilla.org//docs/Web/JavaScript/Reference/Global_Objects/Object/assign) does not do a **deep** one
* Fix: \[ZDK] \[DataStore] Use less variable cloning
* Fix : YouTube - Support of adding live from video
* Fix : LiveStore optimization - less unnecessary writes
* Fix : Panel - Wrong panel size applied
* Fix : Sync with Dropbox
* i : Update dependencies (ftdomdelegate)

# 12.0.0.9
* \+ : CommonStore
* \+ : Panel - Refactor of the code generating stream html
* Fix : Sync with Dropbox

# 12.0.0.7 - 12.0.0.8
* \+ : Panel - Refactor of the code generating stream html

# 12.0.0.6
* \+ : Panel - Ability to navigate with keyboard and open stream with enter
* Fix : setIcon/badgeText, contextMenu are not supported on android (fixing as a WIP android support)
* Fix : Panel - Not showing up-to-date informations on load (probably fixed now)
* \+ : \[ZDK] \[ZTimer] setTimeout / setInterval equivalent with Alarms API
* \+ : \[ZDK] \[Version] Version parse and compare

# 12.0.0.1
* \+ : Minimum version - Chrome 61 and Firefox 60
* \+ : Panel - Use of [CSS Grid layout](https://developer.mozilla.org/fr/docs/Web/CSS/CSS_Grid_Layout)
* \+ : \[ZDK] \[ChromePreferences] - New type : JSON
* \+ : Reworked StreamListFromSetting class, to use less space in preferences
* \+ : Twitch - Setting to choose to include Twitch's rediffusions (included by default)
* \+ : YouTube - support gettings all lives wihtout YouTube API 
* Fix : Stream notification of stream that are not in the list anymore

# 11.16.3
* Fix : Remove Patreon link

# 11.16.0
* \+ : YouTube data with less YouTube API, serveur can not handle load

# 11.15.0
* \- : Panel - Not resizing images anymore, but still using lazy loading
* Fix : Panel - Better condition to load browser polyfill
* Fix : Forgotten console code

# 11.14.1
* Fix : Forgotten code to comment

# 11.14.0
* i : Cleaning old preferences migrations
* \+ : Use CSS scrollbar on Chrome instead of javascript one
* Fix : \[ZDK] \[ChromePreferences] - Exporting file on Vivaldi

# 11.13.1
* Fix : YouTube Patreon setting deleted on load due to a previous version

# 11.13.0
* \+ : YouTube - Use channel "/live" for non-patreon
* Fix : Mixer - Use Client-ID in header
* Fix : Move clipboard writing permission to non-optionnal to avoid problems

# 11.12.0
* \+ : Panel - experimented level - Show icon on streams with error(s)
* Fix : Option page - unused function;

# 11.11.0
* Fix : YouTube Patreon password, because of the quotas limits getting too close.

# 11.10.10
* i : Moved function to open tab if not already exist to ZDK
* Fix : Trying to open a tab without any Window opened

# 11.10.9
* Fix : Panel - Online stream - Profile picture padding

# 11.10.8
* Fix : browserIcon - Now use png to prevent being blocked by Firefox's fingerprinting protection
* Fix : Panel - Online stream picture - Max width
* Fix : \[ZDK] \[ChromePreferences] - Export file name

# 11.10.7
* i : CSS style uniformity
* \+ : NPM Test script using Stylelint
* Fix : Panel support touch screens (has they cannot have hover)
* Fix : Tooltips - Auto-hide after 3s on touch screens

# 11.10.6
* Fix : Panel support of bigger screens

# 11.10.5
* Fix : Wrong version of dom-delegate

# 11.10.4
* i : ZDK update
	* \+ : \[ZDK] loadBlob can now read as text with a second argument
	* \+ : \[ChromePreferences] Core to import/export from/to file
	* \+ : \[ZDK] Simulate click, now needed by ChromePreferences
	* \+ : \[ChromePreferences] New setting type: File
	* \+ : \[ChromeNotificationControler] Sound support on notifications, using [notifications.onShown](https://developer.mozilla.org//Add-ons/WebExtensions/API/notifications/onShown) to begin it, when supported
	* \+ : \[ZDK] Promise base setTimeout
	* \+ : \[ZDK] getPageSize to get the page actuel size
* Fix : Special height/width on the toolbar menu, on Firefox 57+

# 11.10.3
* Fix : Use uncompressed libs to avoid review rejections (Firefox)
* Fix : Use [Promise.prototype.finally()](https://developer.mozilla.org//docs/Web/JavaScript/Reference/Global_Objects/Promise/finally) instead of creating a "complete" method, as a polyfill
* Fix : ZDK Request now use mapToObj from itself

# 11.10.2
* Fix : Stream Settings - Whitelist/Blacklist not showing

# 11.10.1
* i : Now working on Waterfox, there was only a bug with localStorage migration
* \- : Remove Web Extension migration for 8.* (and previous) migration, no longer needed
* Fix : Bug checking some streams when something going wrong with initial checking

# 11.10.0
* i : Simplified loading
* i : Changed ChromePreferences to use super to access to original methods
* i : Changed Tooltip system (because of Firefox troubles)
* i : Panel - Changed drag/drop data management
  * Data, now, stored in a local variable
  * Now drop the url of the stream

# 11.9.1
* Fix : Translation id

# 11.9.0
* i : Updated perfect-scroll, new version without jQuery 
* \+ : Complementary color in css theme, used for text inputs
* \+ : Custom buttons for input numbers
* \+ : "Live" event binding, using [ftdomdelegate](https://github.com/ftlabs/ftdomdelegate), to remove jQuery
* \+ : [Tooltip](https://github.com/matthias-schuetz/Tooltip) (MIT license), replacing Bootstrap's one
* \- : Removed jQuery
* \- : Bootstrap Tooltip, because it need jQuery
* Fix : (Finally, I hope) fix for drag enter/leave class applying

# 11.8.3
* \+ : Replace default input text and textarea style
* Fix : Support to eventually disable stream picture lazyloading

# 11.8.2
* Fix : Forgotten test

# 11.8.1
* Fix : Width for preferences with radio input

# 11.8.0
* \+ : Google Material Design for input checkbox and radio
* \+ : Menulist preference displayed as radio inputs if 5 items max
* \+ : Some css (used in options and panel's options) moved into a common file for inputs
* \+ : Started using [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_variables) for theme generation, less css code generated by JavaScript

# 11.7.0
* i : Twitch URI go.twitch.tv* support

# 11.6.3
* i : Twitch API v5

# 11.6.2
* i : Clone canvas instead of using base64 data for stream item logo
* Fix : No vocal notification with Twitch

# 11.6.1
* Fix : Stream picture load in Firefox

# 11.6.0
* i : Chrome min version increased to 55, starting to use ECMA7 ([async function](https://developer.mozilla.org//docs/Web/JavaScript/Reference/Instructions/async_function), [await](https://developer.mozilla.org//docs/Web/JavaScript/Reference/Opérateurs/await))
* i : Moving image loading and base64 generation to ZDK 
* \+ : Custom Memoize, inspired of Underscore's one, to use a "memory" cache made of resized images, smaller
	* i : The resized function should keep the pixel density on retina
* Fix : Panel - Online stream logo position when no picture available
* Fix : Panel - Ignore/Delete mode - Delete not working

# 11.5.0
* i : Load Mustache in the Web Extension background instead of the panel
	* i : Moving Mustache templates from panel to proper files, and loading them in background page
	* i : Moving backgroundTheme's style into a Mustache Template
* i : Request function moved to ZDK.js

# 11.4.1
* Fix : Fail in a condition concerning notifications without buttons support

# 11.4.0
* Fix : Range input position in option page, in Firefox
* Fix : Ability to detect closed notification when supported, and only remove (internally) the notification when it not active anymore (avoid a randomly defined timeout delay)
	* i : Based on [notifications.getAll()](https://developer.mozilla.org//Add-ons/webextensions/API/notifications/getAll) that return active notifications
	* i : See the byUser parameter support of the notification onClosed event ([notifications.onClosed on MDN Web Doc](https://developer.mozilla.org//Add-ons/webextensions/API/notifications/onClosed#Parameters))

# 11.3.0
* \+ : Ability to add a unit to range inputs
* \+ : Height and width settings to resize the panel
  * i : Style updates due to that change

# 11.2.2
* Fix : Does not load browser pollyfill when not needed (Firefox)
* Fix : Loading backgroundTheme.js too early, messing with preferences

# 11.2.1
* Fix : Forgotten test

# 11.2.0
* i : Changed initial load system, with somes files and folders moved
* i : Moving from Underscore to Lodash, using a custom build to only have debounce
* i : Moving to the slim version of jQuery
* Fix : Vocal notification

# 11.1.0
* \+ : Stopped using native (Web Extension API) translations to get pural support, with i18next
* Fix : Panel css

# 11.0.8-11.0.9
* Fix : Get embed from page

# 11.0.7
* Fix : Rollback on Smashcast pictures surprisingly using "hitbox.tv"

# 11.0.6
* Fix : Problem with onResize event on Firefox, in panel

# 11.0.5
* Fix : Problem with Web Extension pollyfill on Firefox, in panel

# 11.0.1 - 11.0.4
* Fix : Error on Firefox with runtime api for messages
* Fix : Case where "next" url return by API contain query data
* Fix : Forgotten "hibox"

# 11.0.0
* i : Updated perfect-scrollbar
* i : Description updated for Smashcast and Mixer
* i : Code cleanup / fixing
* i : Reworked notifications, moving into a Promise way
* i : Reworked preferences, moving it into a Class / Map
* \+ : Added Web Extension-pollyfill, making possible to use the Web Extension API from Mozilla on Opera and Chromium/Google Chrome
  * Mainly, it is a Promise based one, unlike the original one using callbacks
* Fix : English localization
* Fix : Errors with vocal messages
* Fix : Importation of stream for Twitch (not sending parameters)

# 10.1.1
* Fix : Moved settings from Beam and Hitbox

# 10.1.0
* i : Moving Hitbox to Smashcast, considering API is the same
* i : Moving Beam.pro to Mixer.com, considering API is the same
* i : Code cleanup / fixing
* Fix : Error in option-api.js when launch in the background page

# 10.0.5
* Fix : YouTube online streams URL was channel's one instead of the stream one.

# 10.0.4
* i : In the panel, no more event attached to stream items in the pane, only one attached to the body (better performances)
* i : Almost no events attached to preferences in the same way
* Fix : Forgotten onClick in the stream item (Mustache template)
* Fix : Function mispell in the panel
* Fix : Importation failing because of unknown preference

# 10.0.3
* Fix : Panel width on Firefox

# 10.0.2
* Fix : Panel height glich in Opera
* Fix : Partial fix for the new YouTube design breaking a part of the YouTube support

# 10.0.1
* Fix : Stream list in panel, grouped by Website

# 10.0.0
* i : Using more ECMA5/6 (more class and const)
* i : Updated Material Icons
* i : Updated perfect-scrollbar (0.6.16)
* \+ : Support of Picarto.tv
* \+ : Ability to display stream name when adding stream instead of id
* \+ : Starting to use Mustache in the panel as template system, making easier the creation and insertion of the stream list elements, and websites for grouped support
* \+ : Default picture/logo for streams in panel, if no other is available
* \+ : Ability to disable all notifications from the panel
* Fix : Tooltips ("titles") translation

# 9.2.1-9.2.2-9.2.3-9.2.4
* Fix : Update detection, onInstalled event does not seems to work correctly on Firefox

# 9.2.0
* i : New Firefox Minimal version 52, following ESR version. The Firefox support of Web Extension is not "finished" / stable, in my point of view, so there might be some new minimal version in the Future, depending of the bug corrected or discovered too in Firefox.
* \- : Dropped update detection without onInstalled event, no longer needed

# 9.1.1
* Fix : Localization
* Fix : Changed desciption of confirmation adding stream because the setting is used with confirmation too

# 9.1.0
* \+ : Ability to reactivate stream already configured but hidden / ignored.
* Fix : Potential error reading viewer number with YouTube

# 9.0.6
* Fix : Removed perfect-scrollbar in option page due to bugs (Firefox / Chrome) on the option page height

# 9.0.5-9.0.4
* Fix : Option page not showing on Firefox

# 9.0.3
* Fix : Option page in some resolutions
* Fix : Disable click on streams in the panel during "change" mode

# 9.0.2-9.0.1
* Fix : Check "end" detection when no stream is checked

# 9.0.0
* \+ : Streams are now checked with a queue system limiting the number of requests running simultaneously

# 8.9.0
* \+ : Youtube importation does not use xml to object parse anymore
* Fix : Clipboard function moved to panel, mainly as workaround for Firefox

# 8.8.10
* Fix : Ignore spaces from Youtube API Keys

# 8.8.9
* Fix : Better filter for Youtube programmed events
* Fix : Forgotten test/debug console.dir()

# 8.8.8
* Fix : Gives focus to input when enabling stream search in the panel
* Fix : Avoid duplicated vocal notifications on channels that have several streams
* Fix : Youtube stream URL retrieving variable mispelled

# 8.8.7
* Fix : Online streams if no status
* Fix : Youtube support retrieve all informations from the same request as the stream list 

# 8.8.6
* Fix : Better way to get Youtube informations, to avoid jQuery

# 8.8.5
* Fix : Youtube programmed event shown as online

# 8.8.4
* Fix : Trying to fix performances issues using jQuery to get sub nodes (with $(node).find() ) instead of using DOMParser
* Fix : Broken Twitch support: api key added
* Fix : Panel tooltips staying shown

# 8.8.3
* Fix : Stream alignment fix

# 8.8.2
* Fix : Better space usage for online streams (status can use whole width)
* Fix : Some Youtube links with protocole missing
* Fix : Stream individual setting of offline vocal notification

# 8.8.1
* i : Remade positioning of elements inside streams, in panel
* Fix : Ignore button in "change" mode wasn't updating the preference on confirmation
* Fix : Stream buttons tooltip placement (now on the left)
* Fix : Youtube probably copy/paste fail

# 8.8.0
* \+ : Ignore/Un-ignore streams added in the mode that was "delete mode"
* Fix : Default youtube support does not use YouTube "quota" API anymore and some changes in the "core" to get viewers

# 8.7.1
* Fix : Clicking on streams (Panel)
* Fix : streamListFromSetting class, delete stream when no website defined on the contructor
* Fix : Delete mode in the panel now make a Map of the streams to delete, and the deleteStream function is replaced with a deleteStreams to avoid updating stream list preference after each stream

# 8.7.0
* \+ : New delete mode in the panel
* \+ : Notification on the importation end of the stream for a website
* Fix : Potential error with xmlToJSON custom parse in Request
* Fix : In panel, avoid updating scrollbar after each stream inserted in the page
* Fix : Saving in individual stream settings
* Fix : Minor fix in updatePanelData

# 8.6.0
* \+ : Youtube importation using RSS subscriptions list
* \+ : Xml support in Request using xml2jsobj ( https://www.sitepoint.com/how-to-convert-xml-to-a-javascript-object/ )

# 8.5.0
* \+ : Range input type support in the option API
* \+ : Preference for volume of vocal notifications
* \+ : Theme on number input and select preferences
* Fix : Voice notification 

# 8.4.4
* Fix : Minor fixes

# 8.4.3
* Fix : Minor fixes

# 8.4.2
* Fix : consoleDir, optionnal string

# 8.4.1
* Fix : Preferences init with console

# 8.4.0
* i : Simplified request "paging" to get stream data
* i : console.* for index.js is now shown in console for experimented user only
* \+ : Request now support post and use content, but use `Array[key,value]` / Map not alike Firefox SDK API
* \- : APIs_RequiredPrefs, because platforms script are able to access to preferences directly
* Fix : Youtube stream list wasn't retrieving the pageToken to get the next pages
* Fix : Spaces in Patreon password

# 8.3.1
* \+ : Add real preference for my Patreons only server, for Youtube API

# 8.3.0
* i : Youtube support changed, to avoid using "quota" API

# 8.2.0
* i : perfect-scrollbar now use jQuery, as it's now loaded anyway
* i : Panel debug section is now for experimented users
* i : Moved the addon version to footer, in panel
* \+ : jQuery for the tooltips (title)
* \+ : Tooltip (title) on the Patreon link, in panel
* Fix : Use Bootstrap to show tooltips (title) on Firefox
* Fix : Youtube stream now open in the full version links

# 8.1.0
* i : Copy button now copy "original" stream URL
* \+ : Titles on panel buttons
* \+ : Temporarly disable Hide/Ignore in panel
* \+ : Setting level (basic, Advanced, Experimented)
* \- : Livestreamer support
* Fix : Youtube Gaming support
* Fix : loadJS was not loading if a script was already in the page
* Fix : Channel list end, not executed at the right moment
* Fix : Notification with button was doing event and wasn't supposed to (event on the button)
* Fix : Delete the translation data attribute (data-translate-id / data-translate-title) after translate it, to avoid re-process it again

# 8.0.0
* i : perfect-scrollbar update (0.6.12) and in option page in the Web Extension
* i : Channel information before stream process to use Youtube channel name in stream name
* i : Changed Request function to be more alike Firefox API (Request().get) (Web Extension only)
* i : loadJS now using Promise and no callback anymore (Web Extension only)
* i : Changed websites, streamListFromSetting, and live data (live status and channel info) from object to Map
* i : Replaced some for in loops with array.forEach like ones
* i : Moved all console.* from stream Requests to one result
* i : *Starting to test Web Extension in Firefox*, with needed changes (Web Extension/Firefox)
* i : Moved the loadPreferences function for option and panel to option-api (Web Extension only)
* i : SVG pictures are now rendered into canvas using Image and not canvg (Web Extension only)
* i : Preferences now using chrome local storage area (not localStorage anymore), with a copy of the preferences in a variable to avoid async (Web Extension only)
* \+ : Add headers support with the custom Request function
* \+ : Add Youtube support
* \+ : Re-arranged function to add stream to allow getting IDs from user and video pages with Youtube
* \+ : Replaced checkLivesProgress_* function to detect end by promise system (ES6)
* \+ : Moved importation real user id
* \+ : Now using the promise system to detect end and refresh panel after
* \+ : Global timing for checkLives
* \+ : Grouped timing for checkLives streams (Web Extension only)
* \+ : Stream setting to ignore streams on the icon
* \+ : Chrome API notification, contextMessage to say it's notification from "Live notifier" (Web Extension only)
* \+ : Theme on the option page (Web Extension only)
* \+ : Streams configured with unsupported / not load website are now shown in the panel
* \+ : Add a custom timeout in Request (30s)
* \+ : Pressing shift when clicking on the button to import from file or sync will merge instead of replacing (Web Extension only)
* \+ : Hidden request timeout preference
* \+ : Voice notification not enabled by default
* \- : Deleted Request_Get function, no longer needed to avoid copy/paste problem (Firefox only)
* \- : Dropped Web notifications support (Web Extension only)
* Fix : Unsuccessful channel list requests
* Fix : Online icon badge (Web Extension only)
* Fix : Stream setting not displayed in option page (Web Extension only)
* Fix : Beam importation
* Fix : Some French translations
* Fix : Using onClick event again on notification without buttons
* Fix : Useless translations on preference nodes

[old changelog](/CHANGELOG_archive.md)
