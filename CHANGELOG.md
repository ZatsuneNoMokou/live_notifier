# 5.7.3
* Fix: Section padding (scrollbar)

# 5.7.2
* Fix: Dailymotion channels pattern missing
* Fix: Localization
* Fix: Removed Android from manifest, toggle button api not working / missing

# 5.7.0
* +: Alphabetical order of streams (and no longer grouped by website)

# 5.6.2:
* Fix: Black text color (panel theme)

# 5.6.1:
* Fix: Various bug fix

# 5.6.0:
* +: Add website logo next to stream titles, in the panel
* Fix: Twitch Requests overrideMimeType

# 5.5.3:
* Fix: Error importing streams in Beam
* Fix: Refresh when importing, and refresh only added / removed streams

# 5.5.1:
* Fix: Error importing streams in Beam when id does not exist

# 5.5.0:
* +: Support importing followed streams in Beam

# 5.4.4:
* Fix: Setting that should not appear in the panel (on Firefox), and localization

# 5.4.3:
* Fix: Removed useless console.log in getValueFromNode
* Fix: Clean console.* in panel_contentScriptFile.js for mozilla build

# 5.4.2:
* Fix: Dailymotion Game video pattern missing

# 5.4.1:
* Fix: Position of delete stream tooltip with online streams
* Fix: Addon description

# 5.4.0:
* +: Replaced delete stream mode by a html5 drag-n-drop

# 5.3.1:
* Fix: Use id as default stream name

# 5.3.0:
* +: Use textContent instead of createTextNode
* +: Support filtering game (with website providing this information)
* +: Use 1k style for >1000 viewers
* Fix: Lower case search with stream filters
* Fix: Make sure that the count of online / offline streams is updated properly with filters

# 5.2.0:
* +: Make additional stream setting data possible
* +: Whitelist and/or blacklist for stream status

# 5.1.1:
* Fix: Allow to add Dailymotion from Dailymotion Gaming videos (vod)
* Fix: Update badge/icon when new window is opened and when window focus change

# 5.1.0:
* +: Beam.pro support

# 5.0.1:
* Fix: Livestreamer copy buttons (panel)

# 5.0.0:
* +: Add support to multi stream per setting, allowing to support using Dailymotion channel as setting instead of only videos
* +: Using the add button (from the panel) on Dailymotion with an embed or a page of a video will add the Dailymotion channel
* Fix: Use Twitch display name to get exact streamer case (uppercase and lowercase letters)

# 4.7.2
* +: Add current version in the updated notification

# 4.7.1
* Fix: Avoid notification on installation

# 4.7.0
* +: Addon update notification
* Fix: Settings from panel

# 4.6.4
* Fix: Height of Offline streams

# 4.6.3
* Fix: Viewer count / Control stream buttons (position)

# 4.6.2
* Fix: Viewer count

# 4.6.1
* Fix: Panel html
* Fix: Style of settings from the panel
* Fix: Control stream buttons (position)
* Fix: Localization (copy Livestreamer title)

# 4.6.0
* +: Added 2 buttons to streams, to delete a stream and to copy the Livestreamer command
* Fix: Blank image category for Hitbox

# 4.5.0:
* +: More settings in the panel
* +: slimScroll in the settings, in the panel

# 4.4.0:
* +: Simplified stream item events from panel

# 4.3.4:
* Fix: Hitbox private channel error

# 4.3.3:
* Fix: Check delay setting (avoid 0)

# 4.3.2:
* Fix: Online stream logo

# 4.3.1:
* Fix: French locale

# 4.3.0:
* i: More compact lines for offlines streams

# 4.2.1:
* Fix: 64px logo in index.js

# 4.2.0:
* +: Theme preferences can now be changed from the panel directly
* Fix: Default color on theme

# 4.1.1:
* Fix: Removed forgotten comment

# 4.1.0:
* +: Logo of offline streams from Twitch

# 4.0.8:
* Fix: Deleting mode text warning

# 4.0.7:
* Fix: Deleting mode text warning color

# 4.0.6:
* Fix: Scrollbar

# 4.0.5:
* +: Now using slim-scroll to fit with panel theme

# 4.0.4:
* Fix: Toggle button size

# 4.0.2-4.0.3
* +: Move project to GitLab

# 4.0.1
* +: Main icon size

# 4.0.0
* +: New addon icon (SVG). Source picture from https://pixabay.com/fr/surveiller-live-%C3%A9cran-978055/ in CC0 (Public Domain)
* i: Début portage Chrome

# 3.3.5
* Fix: Locale

# 3.3.4
* Fix: Style (replaced em by px)

# 3.3.1-3.3.3
* -: Removed all default stream

# 3.3.0
* Fix: French locale
* Fix(Dev version only): Console group and time when importing
* +: Hitbox support to import streams

# 3.2.1
* Fix: Description precision about Livestreamer command

# 3.2.0
* +: Copy Livestreamer command when clicking on a stream (when it's online)
* Fix: Locale fix (French one)

# 3.1.0
* +: More let used instead of var
* +: Import your streams from Twitch

# 3.0.0
* +: Reworked function to get steam list. Simplification to edit current stream list.
* +: Delete currently configured streams from panel (confirmation setting activated by default)
* Fix (Dev version only): Console Group and Time when not valid request
* Fix: Fixed locale

# 2.14.2
* Fix: Viewer count when streamer name is too long

# 2.14.1
* Fix: Load style earlier
* Fix: Removed unused function from panel_contentScriptFile.js

# 2.14.0
* +: Checking better is currently check is a stream url and error(s)
* +: Support of embed players for the adding stream button (LevelDown supported for example, when the stream is on)

# 2.13.2
* ~Fix: doNotifNoLink simplification
* Fix: No connection when requesting data

# 2.13.1
* Fix: Remove addStream button event (port) on unload

# 2.13.0
* +: Support adding stream, in currently opened tab (some security to avoid "not stream url" to be added

# 2.12.3
* +: The color of theme use the light level of the picked color
* +: Theme data now is now sent to panel via port only is settings haven't changes
* Fix: Black text color for light theme because of @import

# 2.12.2
* Fix: Config color name

# 2.12.1
* Fix: Shaddow

# 2.12.0
* +: Theme colorisation

# 2.11.0
* +: Theme support (theme function, theme option, theme localization)
* +: Light theme (will be improved in the future, probably)
* +: Moved css files to a css folder
* +: Self hosted Google Material Design icons, font way to make colorisation easier (font files in the addon to avoid privacy issues)
* Fix: Current viewer count when the streamer have no picture available in the api

# 2.10.1
* Fix: Stream status in panel being cut because of max-height

# 2.10.0
* +: Add current viewer count
* +: Now use stream urls from api as a more "clean"
* +: Preparation for other(s) theme color(s)
* Fix: Change stream logo, now inserted as img to make sure that its position is what it is supposed to be

# 2.9.1
* Fix: Offline streams titles, in the panel

# 2.9.0
* +: Circle logo in the panel (stream state)
* +: Check if tab already opened, not only title to open stream tab
* +: Pointer cursor in the panel on the streams

# 2.8.2
* Fix: Stream logo fix (I hope) in the panel

# 2.8.1
* Fix: Streamer logo on offline notification

# 2.8.0
* +: Show picture in notifition
* +: Show streamer logo in the offline streams
* +: Show the online/offline logo over the stream logo
* +: Separate category logo url and streamer one

# 2.7.1
* +: Support picture (display picture instead of online logo when it is possible)
* +: Simplified doOnlineNotif and doOffLineNotif
* Fix: setIcon for Dailymotion (second function)
* Fix: Execute second function for Dailymotion when stream is offline to get channel name

# 2.6.1
* Add "Game" support for Dailymotion, Hitbox, and Twitch (Dailymotion one is moved into the new way to do it)

# 2.5.1
* Fix: Color of stream link (TriBad comment on addon page, on mozilla)

# 2.5.0
* +: Second function to check lives for dailymotion changed. It now support game when the stream support it. This function now use game.title and user.screenname.
* Fix: Some status too long on some streams for the panel items
* Fix: Avoid to update live status when the JSON data received is an error
* +: Turned the button from action button to toggle one

# 2.4.1
* Fix: Some status too long on some streams for the panel items
* Fix: Avoid to update live status when the JSON data received is an error

# 2.4.0
* +: Second function to check lives for dailymotion changed. It now support game when the stream support it. This function now use game.title and user.screenname that isn't in the Dailymotion doc, so currently in test.

# 2.3.3
* +: Build hosted on GitHub become a dev one, including console logging that aren't made for public
* +: Used some different console functions to make it more readable
* -: Hidden debug preference

# 2.3.1
* Fix: Minor fix, only show debug info if hidden preference is checked (need Firefox preference too)

# 2.3.0
* +: Dailymotion changes
* +: Remplaced document.getElement... with document.querySelector

# 2.2.0
* i: Dailymotion changes

# 2.1.0
* +: Code cleanup
* Fix: Possible variable conflict which could make false notifications

# 2.0.0
* +: Deep code cleanup

# 1.4.9
* +: The panel now show stream status with supported websites (Hitbox and Twitch)
* Fix: Twitch charset

# 1.4.8
* +: Display, if setting is checked, of offline streams in the panel (unchecked setting by default)
* Fix: Notification when streams are offligne
* i: Grey badge when there's no online currently

# 1.4.7
* Fix: Error when one of the supported websites was empty (thanks Purexo)

# 1.4.6
* +: Added a text and a background image to make panel more clear
* i: Code cleaning

# 1.4.5
* Fix: Localization support (fr-FR renamed to fr)

# 1.4.3
* +: Added Twitch account of Shorty in the default configuration
* Fix: Default localization is now English (there wasn't really one default language defined, with the possible problems with it)
* i: The panel now use Material design (dark)

# 1.4.2
* +: Button refresh in the panel (Refresh text will be replaced by icon in the future)
* Fix: Notification with Hitbox (too long status?)
* i: Optimisation of code

# 1.4.1
* +: Doesn't show panel when no stream is online
* +: Better panel style (css)
* Fix: Badge count only streams still existing in settings, because deleted stream (from settings) was kept in the count

# 1.3.1
* +: Affiche le nombre de streams en ligne en utilise le "badge" du boutton

# 1.0.2
* clearInterval on addon unload

# 1.0.0
* i: Initial release
