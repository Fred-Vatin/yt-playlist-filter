# Youtube : Filter the “Save to Playlist” Menu

This project contains userscripts in `user script/` directory. You need a browser extension like [Tampermonkey](https://www.tampermonkey.net/) to install it.

To install the script for **YouTube**, click the button below.

[![Install Userscript](https://img.shields.io/badge/Install_Userscript-Playlist%20Filter-blue?style=for-the-badge)](https://raw.githubusercontent.com/Fred-Vatin/yt-playlist-filter/main/user%20script/yt-playlist-filter.user.js) [![BUY ME A COFFEE](https://img.shields.io/badge/BUY%20ME%20A%20COFFEE-ffffff?logo=buymeacoffee&style=for-the-badge&color=710067&logoColor=ffe071)](https://github.com/sponsors/Fred-Vatin)

To install the script for **YouTube Music**, click the button below.

[![Install Userscript](https://img.shields.io/badge/Install_Userscript-Playlist%20Filter%20Music-blue?style=for-the-badge)](https://raw.githubusercontent.com/Fred-Vatin/yt-playlist-filter/main/user%20script/ytm-playlist-filter.user.js) [![BUY ME A COFFEE](https://img.shields.io/badge/BUY%20ME%20A%20COFFEE-ffffff?logo=buymeacoffee&style=for-the-badge&color=710067&logoColor=ffe071)](https://github.com/sponsors/Fred-Vatin)

*It is full rewrite and enhancement of another [script](https://gist.github.com/f-steff/4d765eef037e9b751c58d43490ebad62) named __YouTube “Save to Playlist” Enhancer__. Because it stopped working.*

## Features

- add an input to playlists list menu to filter them
- when watching a video or listen to a music, you can press `p` to open the *“Save to playlist”* menu. *doesn’t always work on chromium browsers*.
- if the video is already in a playlist, this playlist is shown at the top of the list. **Youtube Music doesn’t provide this feature yet.**
- multiple youtube languages UI are supported and can be easily added
  - for now: English, French, Deutsch, Spanish, Italian, Portuguese

## Screenshots

<img width="400" alt="image" src="https://github.com/user-attachments/assets/217ba7d6-50ae-476f-894f-e29ccc4d5c1b" />

## Prerequisites

- your browser needs the extension [Tampermonkey](https://www.tampermonkey.net/) or an equivalent to install and run user scripts

> [!WARNING]
> If on Edge you installed **Tampermonkey** from the Edge Add-ons store AND if pressing `P` only opens the save **playlist menu** for less than a second, then :
> - Open Tampermonkey dashboard > utilities > Cloud. Select Google Drive and export your config. Then close the tab.
> - Open [edge://extensions](edge://extensions/)
> - Search for `Tampermonkey` and disable it.
> - Go to the [chrome store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) and install this version
> - Open Tampermonkey dashboard > utilities > Cloud. Select Google Drive and import your last config.
> - Go to your installed userscripts tab and check if there are no duplicate then update them all.

## Configure

In your extension, search for the script `YouTube Save to Playlist filter` and edit it.

<img width="500" alt="tampermonkey" src="https://github.com/user-attachments/assets/090ad3eb-0fd2-4688-97b5-4fc2f2385976" />

There is a `SETTINGS` section at the beginning. Just read the text and edit the value.

<img width="1000" alt="script edit" src="https://github.com/user-attachments/assets/c259435c-9da2-4730-8004-937d27f03bc4" />

> [!IMPORTANT]
> SAVE THE MODIFICATION.
> THEN RELOAD YOUTUBE TO APPLY YOUR SETTINGS. TEST THE FILTER INPUT IS ADDED AS EXPECTED.

> [!NOTE]
> If you add your language, open a [discussion](https://github.com/Fred-Vatin/yt-playlist-filter/discussions) to share the values you added to the script. I will add them in a next release for everyone.


## Automatic Updates

If your extension that handles user scripts is set to auto update, if a new version is available in this GitHub repository, it will update it unless you modified the script.

That’s why I recommend to watch this repository and star ⭐ to easily find this page again in the future.

<img width="350" alt="image" src="https://github.com/user-attachments/assets/227caa77-15b7-4560-b804-d9930fa4559f" />
<img width="400" alt="image" src="https://github.com/user-attachments/assets/a0f43c4b-25ae-4aad-8fe2-a5a0531b6934" />



## CONTRIBUTE

- If you are sure you found a bug, open an [issue](https://github.com/Fred-Vatin/yt-playlist-filter/issues)
- If you want to ask something, get help, talk and share something with others about this user script, open a [discussion](https://github.com/Fred-Vatin/yt-playlist-filter/discussions)

---

# OTHER SCRIPTS

You might be interested by…

[![Userscript](https://img.shields.io/badge/Userscript-Run_yt--dlp_commands_from_browser-blue?style=for-the-badge)](https://github.com/Fred-Vatin/run-yt-dlp-from-browser)
