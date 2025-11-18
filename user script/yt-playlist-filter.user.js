// ==UserScript==
// @name         YouTube Save to Playlist filter
// @namespace    fred.vatin.yt-playlists-filter
// @version      1.1.1
// @description  Tap P key to open the “save to playlist” menu where your can type to filter
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @author       Fred Vatin, Flemming Steffensen
// @updateURL    https://raw.githubusercontent.com/Fred-Vatin/yt-playlist-filter/main/user%20script/yt-playlist-filter.user.js
// @downloadURL  https://raw.githubusercontent.com/Fred-Vatin/yt-playlist-filter/main/user%20script/yt-playlist-filter.user.js
// @noframes
// @run-at       document-body
// @grant        window.onurlchange
// @match        https://www.youtube.com/*
// @license MIT
// ==/UserScript==

(() => {
	/**==========================================================================
  * ℹ		SETTINGS
  ===========================================================================*/
	// You can disable or custom the shortkey to open the save to playlist menu
	const ENABLE_SHORTKEY = true;
	// go to https://www.toptal.com/developers/keycode and press the key you want
	// enter here the event.code. The same physical key will work on every keyboard layout
	const SHORTKEY = "KeyP"; // if you want to set a modifier key shortcut, edit the handlePlaylistKey function

	// Add your language for the Save menu entry name
	// - Play a video

	// First case scenario: the "save to playlist" button is in the "…" sub-menu
	// 1. Click the "…" menu button where there is the "save to playlist" menu entry
	// 2. In the dev tool > inspector, search for the selector: yt-button-shape > button[aria-label]
	//    It should be around the 7th match. Copy the [aria-label] value and add it here.
	const MoreActionsButtonText = [
		"More actions",
		"Autres actions",
		"Mehr Aktionen",
		"Más acciones",
		"Altre azioni",
		"Mais ações",
	];
	// 3. search for the selector: #items > ytd-menu-service-item-renderer yt-formatted-string
	//    copy the text content
	const SaveButtonText = ["Save", "Enregistrer", "Speichern", "Guardar", "Salva"];

	// Second case scenario, the "Save" to playlist button is in direct access
	// 1. In the dev tool > inspector, search for the selector: .ytSpecButtonViewModelHost button[aria-label]
	//    until your find the one for the save to playlist.
	// 2. It should be around the 7th match. Copy the [aria-label] value and add it here.
	const DirectSaveButtonText = [
		"Save to playlist",
		"Enregistrer dans une playlist",
		"Zu Playlist hinzufügen",
		"Añadir a lista de reproducción",
		"Salva in una playlist",
		"Salvar na playlist",
		"Guardar na playlist",
	];

	/**==========================================================================
   * ℹ		GLOBAL DEFINITION
  ===========================================================================*/
	let URL = window.location.href;
	console.log("URL (at first loading): ", URL);
	const selector_Header = "yt-panel-header-view-model";
	const selector_List = ".ytListViewModelHost";
	const selector_ListItems = ".toggleableListItemViewModelHost";
	const selector_SelItems = `:scope > yt-list-item-view-model[aria-pressed="true"]`;
	const selector_Item = ".yt-core-attributed-string";
	const selector_OpenMenuParent = "ytd-app ytd-popup-container";
	const InputId = "filterPlaylist";

	// array of all selectors for menu button containing “save to playlist” item
	const selectors_PlaylistContainer = [selector_Header, "yt-contextual-sheet-layout"];

	// Init the P key press listener
	let isListenerActive = false;

	/**==========================================================================
   * ℹ		DETECT URL CHANGE TO RE-RUN THE SCRIPT
  ===========================================================================*/
	if (window.onurlchange === null) {
		console.log("✅ window.onurlchange is supported. Adding 'urlchange' listener.");

		window.addEventListener("urlchange", () => {
			onUrlChange("window.onurlchange");
		});
	} else {
		console.log("❌ window.onurlchange is not supported by this browser or this Tampermonkey version.");
	}

	/**==========================================================================
  * ℹ		CREATE OBSERVERS and Listeners
  * This will allow to disconnect them
  ===========================================================================*/

	// Main observer to detect new playlist menu
	const obsv_PlaylistContainer = new MutationObserver(callback_Container);

	// Observer to detect when the menu is open
	const obsv_MenuOpen = new MutationObserver(callback_MenuOpen);

	// Start observer at first launch
	connect(obsv_PlaylistContainer, {
		strLog: "✅ obsv_PlaylistContainer started 🔌",
	});

	// Handle P key press at first launch if video playing
	if (isPlayer(URL)) {
		togglePlaylistListener(true);
	}

	/**==========================================================================
  * ℹ		ON URL CHANGE
  ===========================================================================*/
	/**
	 * Handle changes to the current browser URL and update playlist listener state accordingly.
	 *
	 * Compares the current window.location.href with the external `URL` variable. If they differ,
	 * updates `URL`, logs the change, and enables or disables the playlist listener depending
	 * on whether the new URL represents a player view.
	 *
	 * @param {string} [event="first loading"] - Optional string describing what triggered the check (used for logging).
	 * @returns {void}
	 *
	 * @sideEffects
	 * - Reads window.location.href.
	 * - Mutates the external `URL` variable.
	 * - Calls `isPlayer(URL)` to determine if the current URL is a player.
	 * - Calls `togglePlaylistListener(true|false)` to enable/disable playlist handling.
	 *
	 * @requires {global} URL - External module-level variable holding the last-known URL.
	 * @requires {function} isPlayer - Function that returns a boolean indicating if a URL is a player view.
	 * @requires {function} togglePlaylistListener - Function to enable/disable playlist listener behavior.
	 */
	function onUrlChange(event = "first loading") {
		const currentUrl = window.location.href;
		console.log(`onUrlChange call by event: ${event}`);

		if (currentUrl !== URL) {
			console.log("URL changed : ", currentUrl);
			URL = currentUrl;

			// enable P key press on video page to open the save to playlist menu
			if (isPlayer(URL)) {
				togglePlaylistListener(true);
			} else {
				togglePlaylistListener(false);
			}
		}
	}

	/**==========================================================================
  * ℹ		FUNCTIONS
  ===========================================================================*/
	/**
	 * Callback function for the MutationObserver watching playlist container changes.
	 * Detects when new playlist menu elements are added to the DOM and adds filtering functionality.
	 * Handles different YouTube menu insertion patterns based on where the menu is first called.
	 *
	 * @param {MutationRecord[]} mutationsList - Array of MutationRecord objects describing DOM changes
	 * @param {MutationObserver} obsv_PlaylistContainer - The MutationObserver instance monitoring playlist container (not used)
	 *
	 * @callback MutationCallback
	 * @listens {MutationEvent} childList - Listens for changes in child elements
	 */
	let items = 0;
	function callback_Container(mutationsList, obsv_PlaylistContainer) {
		for (const mutation of mutationsList) {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				// Iterate only on newly added nodes
				for (const node of mutation.addedNodes) {
					if (node instanceof Element) {
						// console.log(
						// 	`🔍 Mutation on ${mutation.target.tagName}: ${mutation.addedNodes.length} addedNodes`,
						// 	node
						// );
						for (const selector of selectors_PlaylistContainer) {
							if (node.matches(selector)) {
								items++;
								console.log(`✅ #${items} new selectors_PlaylistContainer detected`, node);
								let menu = node;
								let header = null;

								/**===============================================
                *	⚠		WARNING
                   Youtube inserts menu node differently depending on
                   from where you call it first.
                   We need to figure it out according to the
                   menu element value.
                ================================================*/

								if (menu.matches(selector_Header)) {
									menu = document.querySelector("yt-contextual-sheet-layout");
									header = node;
								} else {
									header = menu.querySelector(selector_Header);
									if (!header) break;
								}

								if (header.textContent.trim().length === 0) {
									console.log(`❌ header doesn’t contain title`, header);
									break;
								}

								if (menu && header) {
									const list = menu.querySelector(selector_List);
									console.log(`✅ menu detected`, menu);
									console.log(`✅ header detected`, header);

									if (list) {
										console.log(`✅ list detected`, list);
										addFilterInput({ header: header, list: list });
									} else {
										console.log(`❌ list matching selector "${selector_List}" not detected in:`, menu);
									}
								} else {
									console.log(`❌ menu or header not detected in node:`, node);
								}
							}
						}
					}
				}
			}
		}
	}

	/**
	 * MutationObserver callback that watches for changes to a menu element's aria-hidden state
	 * and focuses a target input when the menu becomes visible.
	 *
	 * Iterates over the provided MutationRecord list and, for each mutation, inspects
	 * mutation.target.ariaHidden. If ariaHidden is falsy (indicating the menu is open/visible),
	 * the function calls setFocus(InputId) to move focus to the configured input element.
	 *
	 * @param {MutationRecord[]} mutationsList - Array of MutationRecord objects provided by the observer.
	 * @param {MutationObserver} obsv_MenuOpen - The MutationObserver instance that invoked this callback (not used)
	 * @returns {void}
	 *
	 * @remarks
	 * - The implementation expects `mutation.target` to expose an `ariaHidden` property; in browsers
	 *   you may need to use `getAttribute('aria-hidden')` or similar depending on how aria state is read.
	 * - Ensure `InputId` and `setFocus` are defined in the enclosing scope before using this callback.
	 * - Typically used when observing attribute changes on a menu element to detect open/close transitions.
	 */

	function callback_MenuOpen(mutationsList, obsv_MenuOpen) {
		for (const mutation of mutationsList) {
			const AriaHidden = mutation.target.ariaHidden;

			// console.log(
			// 	`mutation type: ${mutation.type}, AriaHidden: ${AriaHidden}, attribute changed: ${mutation.attributeName}`,
			// 	mutation.target
			// );

			if (!AriaHidden) {
				setFocus(InputId);
			}
		}
	}

	/**
	 * Start observing DOM mutations with the provided MutationObserver and options.
	 *
	 * @param {MutationObserver} observer - The MutationObserver instance to start observing.
	 * @param {Object} [options] - Optional configuration object.
	 * @param {string} [options.strLog=""] - Message to log to the console when observation is started. If an empty string (default), nothing is logged.
	 * @param {MutationObserverInit} [options.config={ childList: true, subtree: true }] - Options passed to observer.observe().
	 * @param {Node} [options.parent=document.body] - The root node to observe. Defaults to document.body.
	 * @returns {void}
	 */
	function connect(observer, options = {}) {
		const { strLog = "", config = { childList: true, subtree: true }, parent = document.body } = options;
		observer.observe(parent, config);
		if (strLog) {
			console.log(strLog);
		}
	}

	/**
	 * Safely disconnects an observer and optionally logs a message.
	 *
	 * @param {{disconnect: function}|MutationObserver} observer - The observer to disconnect. Must implement a `disconnect()` method (e.g., a MutationObserver).
	 * @param {string} [strLog=""] - Optional message to log to the console if provided and non-empty.
	 * @returns {void}
	 */
	function disconnect(observer, strLog = "") {
		observer.disconnect();
		if (strLog) {
			console.log(strLog);
		}
	}

	/**
	 * Determine whether a URL points to a YouTube watch/player page.
	 *
	 * Logs a message to the console indicating the detection result:
	 *  - "✅ Player detected !" when the URL matches the expected player prefix.
	 *  - "❌ Not a player !" when it does not.
	 *
	 * @param {string} url - The URL to test.
	 * @returns {boolean} True if the URL starts with "https://www.youtube.com/watch?v=", otherwise false.
	 *
	 * @example
	 * // Returns true and logs "✅ Player detected !"
	 * isPlayer('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
	 *
	 * @example
	 * // Returns false and logs "❌ Not a player !"
	 * isPlayer('https://youtu.be/dQw4w9WgXcQ');
	 */
	function isPlayer(url) {
		if (url.startsWith("https://www.youtube.com/watch?v=")) {
			console.log("✅ Player detected !");
			return true;
		} else {
			console.log("❌ Not a player !");
			return false;
		}
	}

	/**
	 * Adds a filter input element to a playlist header if it doesn't already exist.
	 * The input is inserted after the title element and sets up an event listener for filtering.
	 *
	 * @param {Object} elements - The elements object containing references to DOM elements
	 * @param {HTMLElement} [elements.list=null] - The playlist list element
	 * @param {HTMLElement} [elements.header=null] - The header element containing the title
	 * @returns {void}
	 */
	function addFilterInput(elements = {}) {
		const { list = null, header = null } = elements;

		autoTopList(list);

		const existingFilterInput = document.getElementById(InputId);

		if (!existingFilterInput) {
			const title = header ? header.firstElementChild : null;

			if (title) {
				console.log(`✅ title found, insert input`);
			} else {
				console.log(`❌ title not found. Input will NOT be inserted.`);
				return;
			}

			// Create <input>
			const filterInput = document.createElement("input");
			filterInput.id = InputId;
			filterInput.type = "text";
			filterInput.placeholder = "Filter";

			title.parentNode.insertBefore(filterInput, title.nextSibling);

			// On typing => filter
			filterInput.addEventListener("input", (evt) => {
				const inputText = evt.target.value;
				filterPlaylist(list, inputText);
			});

			setFocus(InputId);

			const PopupContainer = document.querySelector(selector_OpenMenuParent);

			// observe the future menu open
			connect(obsv_MenuOpen, {
				parent: PopupContainer,
				config: { subtree: true, attributes: true, attributeFilter: ["aria-hidden"] },
				strLog: "✅ obsv_MenuOpen started 🔌",
			});
		} else {
			console.log(`✅ input already exists`);
		}
	}

	/**
	 * Filters the items in a playlist element based on the provided filter text.
	 *
	 * @param {Element} playlist - The DOM element containing the playlist items.
	 * @param {string} filterText - The text to filter playlist items by. Items not containing this text will be hidden.
	 */
	function filterPlaylist(playlist, filterText) {
		if (!playlist) {
			console.log("❌ filterPlaylist(playlist, filterText): playlist is null or invalid");
			return;
		}

		const listItems = playlist.querySelectorAll(selector_ListItems);
		// const listItems = query(playlist, selector_ListItems);
		const text = filterText.trim().toLowerCase();

		listItems.forEach((item) => {
			// const formattedString = query(item, ".yt-core-attributed-string")[0];
			const formattedString = item.querySelector(selector_Item);
			const title = formattedString?.textContent.trim().toLowerCase();
			item.style.display = text && !title.includes(text) ? "none" : "block";
		});
	}

	/**
	 * Automatically sorts playlist items by placing selected items at the top.
	 * Selected items are playlists in which the current video already exists.
	 * @param {HTMLElement} playlist - The playlist container element to sort
	 * @returns {void}
	 * @description
	 * This function reorganizes playlist items so that selected items appear first,
	 * followed by unselected items. It filters items using predefined selectors,
	 * logs the operation status, and reinserts items in the new order.
	 * @example
	 * const playlistElement = document.querySelector('.playlist');
	 * autoTopList(playlistElement);
	 */
	function autoTopList(playlist) {
		if (!playlist) {
			console.log("❌ autoTopList(playlist): playlist is null or invalid");
			return;
		}

		// Collect all items
		const listItems = Array.from(playlist.querySelectorAll(selector_ListItems));
		console.log("✅ autoTopList(playlist), listItems number: ", listItems.length);

		// Separates the selected ones from the rest
		const selected = listItems.filter((item) => item.querySelector(selector_SelItems));
		const unselected = listItems.filter((item) => !item.querySelector(selector_SelItems));

		if (selected.length > 0) {
			console.log(`✅ autoTopList(playlist), this video belongs to ${selected.length} playlist(s)`);
			// Reinsert in the desired order
			[...selected, ...unselected].forEach((item) => {
				playlist.appendChild(item);
			});

			console.log(`✅ autoTopList(playlist), playlists have been sorted.`);

			const sortedItems = Array.from(playlist.querySelectorAll(selector_ListItems));
			console.log("✅ autoTopList(playlist), sortedItems number: ", sortedItems.length);
		} else {
			console.log("❌ autoTopList(playlist): this video doesn’t belong to any existing playlist");
		}
	}

	/**
	 * Sets focus to the input element with the given ID, resets its value,
	 * and dispatches an "input" event to trigger any associated handlers.
	 * If the element is not found, logs a message to the console.
	 *
	 * @param {string} el - The ID of the input element to focus.
	 */
	function setFocus(el) {
		const input = document.getElementById(el);
		if (input) {
			// reset filter
			input.value = "";

			// Dispatch input event to trigger the handler
			const inputEvent = new InputEvent("input", {
				target: input,
				bubbles: true,
			});

			input.dispatchEvent(inputEvent);

			console.log(`✅ "input" found. Set focus!`);
			// delay required to set the focus
			setTimeout(() => {
				input.focus();
			}, 100);
		} else {
			console.log(`❌ "input" not found. Focus not set!`);
		}
	}

	/**
	 * Attempts to open the "Save to playlist" dialog on a YouTube video page.
	 *
	 * The function first tries to find and click the direct "Save to playlist" button.
	 * If not found, it searches for a "More actions" button using possible button texts,
	 * clicks it, and then looks for the "Save" option in the submenu to trigger the dialog.
	 * Logs an error if neither button is found.
	 *
	 * @returns {void}
	 */
	function openSaveToPlaylistDialog() {
		let directSaveButton = null;
		for (const text of DirectSaveButtonText) {
			const selector = `.ytSpecButtonViewModelHost button[aria-label="${text}"]`;
			directSaveButton = document.querySelector(selector);
			if (directSaveButton) {
				break;
			}
		}

		if (directSaveButton) {
			console.log("✅ openSaveToPlaylistDialog(), direct save button found. Click it");
			directSaveButton.click();
		} else {
			console.log(
				"❌ openSaveToPlaylistDialog(), direct save button NOT found. Search for More Actions menu"
			);

			let moreActionsButton = null;
			for (const text of MoreActionsButtonText) {
				const selector = `yt-button-shape > button[aria-label="${text}"]`;
				moreActionsButton = document.querySelector(selector);
				if (moreActionsButton) {
					break;
				}
			}

			if (moreActionsButton) {
				console.log("✅ openSaveToPlaylistDialog(), More Actions menu found. Click it");
				moreActionsButton.click();
				setTimeout(() => {
					const submenuItems = document.querySelectorAll(
						"#items > ytd-menu-service-item-renderer yt-formatted-string"
					);
					let found = false;
					submenuItems.forEach((item) => {
						if (SaveButtonText.includes(item.textContent.trim())) {
							item.click();
							console.log("✅ Click on Save item:", item);
							found = true;
						}
					});
				}, 250);
			} else {
				console.error("❌ Neither a direct 'Save' button nor a 'More actions' button was found.");
			}
		}
	}

	/**
	 * Handles the 'p' key press event to open the "Save to playlist" dialog on YouTube.
	 * Ignores the event if Ctrl, Alt, or Meta keys are held, or if the focus is on an input, textarea, or editable element.
	 * Prevents default YouTube behavior for the 'p' key and stops event propagation.
	 *
	 * @param {KeyboardEvent} evt - The keyboard event triggered by a key press.
	 */
	function handlePlaylistKey(evt) {
		// Avoid capturing if user holds Ctrl/Alt/Meta, or if in a text field, etc.
		if (
			evt.code === SHORTKEY &&
			// isPlayer(URL) &&
			!evt.ctrlKey &&
			!evt.altKey &&
			!evt.metaKey &&
			evt.target.tagName !== "INPUT" &&
			evt.target.tagName !== "TEXTAREA" &&
			evt.target.contentEditable !== "true"
		) {
			// Prevent YouTube from interpreting 'p' in any other way
			evt.preventDefault();
			evt.stopPropagation();

			// Attempt to open the "Save to playlist" dialog
			openSaveToPlaylistDialog();
		}
	}

	/**
	 * Enables or disables the keydown event listener for handling playlist key actions.
	 * When enabled, adds a keydown event listener to the document that triggers `handlePlaylistKey`.
	 * When disabled, removes the event listener if it is active.
	 *
	 * @param {boolean} enable - If true, adds the event listener; if false, removes it.
	 */
	function togglePlaylistListener(enable) {
		if (!ENABLE_SHORTKEY) return;

		if (enable && !isListenerActive) {
			console.log(`✅ Add press P event listerner`);
			document.addEventListener("keydown", handlePlaylistKey, true);
			isListenerActive = true;
		} else if (!enable && isListenerActive) {
			console.log(`❌ Remove press P event listerner`);
			document.removeEventListener("keydown", handlePlaylistKey, true);
			isListenerActive = false;
		}
	}
})();
