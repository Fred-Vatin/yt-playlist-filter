// ==UserScript==
// @name         YouTube Music Save to Playlist filter
// @namespace    fred.vatin.ytm-playlists-filter
// @version      1.0.3
// @description  Tap P key to open the “save to playlist” menu where your can type to filter
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @author       Fred Vatin
// @updateURL    https://raw.githubusercontent.com/Fred-Vatin/yt-playlist-filter/main/user%20script/ytm-playlist-filter.user.js
// @downloadURL  https://raw.githubusercontent.com/Fred-Vatin/yt-playlist-filter/main/user%20script/ytm-playlist-filter.user.js
// @noframes
// @run-at       document-body
// @grant        window.onurlchange
// @match        https://music.youtube.com/*
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
  // - Play a music
  // - Click the "…" menu button at the bottom where there is the "save to playlist" menu entry
  // - In the dev tool > inspector, search for the selector: ytmusic-menu-navigation-item-renderer.ytmusic-menu-popup-renderer .text
  //    It should be around the 2nd match. Copy the text content and add it here if it doesn’t there yet.
  const SaveToButtonText = [
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
  let PLAYLISTS = null;
  console.log("URL (at first loading): ", URL);
  const selector_MoreActionMenuButton = ".menu.ytmusic-player-bar[dropdown-only] button";
  const selector_MoreActionSubMenuItems = "ytmusic-menu-navigation-item-renderer.ytmusic-menu-popup-renderer";
  const selector_MenuType1 = "yt-contextual-sheet-layout";
  const selector_MenuType2 = "ytmusic-add-to-playlist-renderer.ytmusic-popup-container";
  const selector_HeaderType1 = "yt-panel-header-view-model";
  const selector_HeaderType2 = ".section-heading";
  const selector_ListType1 = ".ytListViewModelHost";
  const selector_ListType2 = "#playlists";
  const selector_ListItemsType1 = ".toggleableListItemViewModelHost";
  const selector_ListItemsType2 = ".ytmusic-add-to-playlist-renderer";
  const selector_SelItemsType1 = `:scope > yt-list-item-view-model[aria-pressed="true"]`;
  const selector_SelItemsType2 = `:scope > #checkbox[aria-checked="true"]`;
  const selector_ItemType1 = ".yt-core-attributed-string";
  const selector_ItemType2 = "#title";
  const selector_OpenMenuParentType1 = "ytd-app ytd-popup-container";
  const selector_OpenMenuParentType2 = "tp-yt-paper-dialog.ytmusic-popup-container:has(> .ytmusic-popup-container)";
  const InputId = "filterPlaylist";

  // array of all selectors for playslists menu and its header
  const selectors_PlaylistsMenu = [selector_MenuType1, selector_MenuType2];
  const selectors_MenuSubElements = [
    selector_HeaderType1,
    selector_HeaderType2,
    selector_ListType1,
    selector_ListType2,
  ];

  // Init the P key press listener
  let IS_KEYPRESS_LISTENER_ACTIVE = false;

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
  const obsv_NewPlaylistsMenu = new MutationObserver(callback_NewMenu);

  // Observer to detect when menu items and required sub-elements are available
  const obsv_MenuItems = new MutationObserver(callback_MenuAvailable);

  // Observer to detect when the menu is open
  const obsv_MenuOpen = new MutationObserver(callback_MenuOpen);

  // Start observer at first launch
  connect(obsv_NewPlaylistsMenu, {
    strLog: "✅ obsv_NewPlaylistsMenu started 🔌",
  });

  // Handle P key press at first launch if video playing
  if (isPlayer(URL)) {
    SetKeydownListener(true);
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
        SetKeydownListener(true);
      } else {
        SetKeydownListener(false);
      }
    }
  }

  /**==========================================================================
  * ℹ		FUNCTIONS
  ===========================================================================*/
  /**
   * MutationObserver callback called when a new node is added to document DOM.
   *
   * Iterates over the provided MutationRecord list and, for each mutation (added nodes),
   * check if the playlist menu is there.
   * If yes, it observes it with callback_MenuAvailable to detect when required sub-elements are ready.
   *
   * Handles different YouTube menu type insertion patterns based on where the menu is first called.
   *
   * @param {MutationRecord[]} mutationsList - Array of MutationRecord objects describing DOM changes
   * @param {MutationObserver} obsv_PlaylistContainer - The MutationObserver instance monitoring playlist container (not used)
   * @returns {void}
   * @callback MutationCallback
   * @listens {MutationEvent} childList - Listens for changes in child elements
   */
  let items = 0;
  function callback_NewMenu(mutationsList, obsv_PlaylistContainer) {
    let header = null;
    let list = null;

    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // Iterate only on newly added nodes
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            // console.log(
            // 	`🔍 Mutation on ${mutation.target.tagName}: ${mutation.addedNodes.length} addedNodes`,
            // 	node
            // );
            for (const selector of selectors_PlaylistsMenu) {
              if (node.matches(selector)) {
                let menu = null;
                items++;
                // console.log(`✅ #${items} new selectors_PlaylistsMenu detected`, node);

                /**===============================================
                *	⚠		WARNING
                   Youtube inserts menu node differently depending on
                   from where you call it first.
                   We need to figure it out according to the
                   menu element value.
                ================================================*/

                if (node.matches(selector_MenuType1)) {
                  menu = node;
                  console.log(`✅ selector_MenuType1 detected`, menu);
                  connect(obsv_MenuItems, {
                    parent: menu,
                    strLog: "✅ obsv_MenuItems started 🔌",
                  });
                } else if (node.matches(selector_MenuType2)) {
                  menu = node;
                  console.log(`✅ selector_MenuType2 detected`, menu);

                  header = document.querySelector(selector_HeaderType2);
                  list = document.querySelector(selector_ListType2);

                  if (!header || !list) {
                    connect(obsv_MenuItems, {
                      parent: menu,
                      strLog: "✅ obsv_MenuItems started 🔌",
                    });
                  } else {
                    if (header) {
                      console.log(`✅ header used`, header);

                      if (list) {
                        console.log(`✅ list used`, list);
                        addFilterInput({ header: header, list: list });
                        break;
                      } else {
                        console.log(`❌ list not detected in menu`);
                      }
                    } else {
                      console.log(`❌ header not detected in menu`);
                    }
                  }

                } else {
                  console.log(
                    `❌ new node seems to match selectors_PlaylistsMenu but for some unknown reason it doesn’t match selector_MenuType1 or selector_MenuType2`,
                    node
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * MutationObserver callback called when a new playlists menu is added to DOM (detected by callback_NewMenu)
   *
   * Iterates over the provided MutationRecord list and, for each mutation (added nodes),
   * check if the required menu elements are there.
   * If yes, it adds the input filter.
   *
   * @param {MutationRecord[]} mutationsList - Array of MutationRecord objects provided by the observer.
   * @param {MutationObserver} obsv_MenuAvailable - The MutationObserver instance that invoked this callback (not used)
   * @returns {void}
   * @callback MutationCallback
   * @listens {MutationEvent} childList - Listens for changes in child elements
   *
   */
  function callback_MenuAvailable(mutationsList, obsv_MenuAvailable) {
    let header = null;
    let list = null;

    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // Iterate only on newly added nodes
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            // console.log(
            // 	`🔍 Mutation on ${mutation.target.tagName}: ${mutation.addedNodes.length} addedNodes`,
            // 	node
            // );
            for (const selector of selectors_MenuSubElements) {
              if (node.matches(selector)) {
                console.log(`✅ new selectors_MenuSubElements detected`, node);

                if (node.matches(selector_HeaderType1)) {
                  header = node;
                  console.log(`✅ selector_HeaderType1 detected`, header);
                } else if (node.matches(selector_HeaderType2)) {
                  header = node;
                  console.log(`✅ selector_HeaderType2 detected`, header);
                } else if (node.matches(selector_ListType1)) {
                  list = node;
                  console.log(`✅ selector_ListType1 detected`, list);
                } else if (node.matches(selector_ListType2)) {
                  list = node;
                  console.log(`✅ selector_ListType2 detected`, list);
                } else {
                  console.log(
                    `❌ new node seems to match selectors_MenuSubElements but for some unknown reason it doesn’t match selector_HeaderType or selector_ListType`,
                    node
                  );
                  continue;
                }

                if (header?.textContent.trim().length === 0) {
                  console.log(`❌ header doesn’t contain title`, header);
                  header = null;
                }
              }
            }
          }
        }
      }
    }

    if (header) {
      console.log(`✅ header used`, header);

      if (list) {
        console.log(`✅ list used`, list);
        addFilterInput({ header: header, list: list });
      } else {
        console.log(`❌ list not detected in menu`);
      }
    } else {
      console.log(`❌ header not detected in menu`);
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

      console.log(
        `callback_MenuOpen triggered. mutation type: ${mutation.type}, AriaHidden: ${AriaHidden}, attribute changed: ${mutation.attributeName}`,
        mutation.target
      );

      if (!AriaHidden) {
        setFocus(InputId);
        if (PLAYLISTS) {
          console.log(`Use PLAYLISTS`, PLAYLISTS);
          autoTopList(PLAYLISTS);
        }
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
    if (
      url.startsWith("https://music.youtube.com/watch?v=") ||
      url.startsWith("https://music.youtube.com/live/")
    ) {
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

    PLAYLISTS = list;

    autoTopList(PLAYLISTS);

    const existingFilterInput = document.getElementById(InputId);

    if (!existingFilterInput) {
      // handle MenuType1 vs MenuType2
      const isType2 = header.matches(selector_HeaderType2);
      let title = null;
      let selector_OpenMenuParent = null;

      if (isType2) {
        title = header;
        title.style.display = "inline-block";
        title.style.marginRight = "20px";
        selector_OpenMenuParent = selector_OpenMenuParentType2;
      } else {
        title = header?.firstElementChild;
        selector_OpenMenuParent = selector_OpenMenuParentType1;
      }

      if (title) {
        console.log(`✅ title found, insert input`, title);
      } else {
        console.log(`❌ title not found Input will NOT be inserted.`, title);
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

      // After the input is inserted, we can disconnect the observer for new sub-menu-elements
      disconnect(obsv_MenuItems, "✅ obsv_MenuItems stopped 🛑");

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
   * @param {Element} playlists - The DOM element containing the playlist items.
   * @param {string} filterText - The text to filter playlist items by. Items not containing this text will be hidden.
   */
  function filterPlaylist(playlists, filterText) {
    if (!playlists) {
      console.log("❌ filterPlaylist(playlists, filterText): playlists is null or invalid");
      return;
    }

    // handle MenuType1 vs MenuType2
    const isType2 = playlists.matches(selector_ListType2);
    let listItems = null;

    if (isType2) {
      console.log(`Use selector_ListItemsType2`);
      listItems = playlists.querySelectorAll(selector_ListItemsType2);
    } else {
      console.log(`Use selector_ListItemsType1`);
      listItems = playlists.querySelectorAll(selector_ListItemsType1);
    }

    // const listItems = query(playlist, selector_ListItems);
    const text = filterText.trim().toLowerCase();

    listItems.forEach((item) => {
      // const formattedString = query(item, ".yt-core-attributed-string")[0];
      const formattedString = isType2
        ? item.querySelector(selector_ItemType2)
        : item.querySelector(selector_ItemType1);
      const title = formattedString?.textContent.trim().toLowerCase();
      item.style.display = text && !title.includes(text) ? "none" : "block";
    });
  }

  /**
   * Automatically sorts playlist items by placing selected items at the top.
   * Selected items are playlists in which the current video already exists.
   * @param {HTMLElement} playlists - The playlist container element to sort
   * @returns {void}
   * @description
   * This function reorganizes playlist items so that selected items appear first,
   * followed by unselected items. It filters items using predefined selectors,
   * logs the operation status, and reinserts items in the new order.
   * @example
   * const playlistElement = document.querySelector('.playlist');
   * autoTopList(playlistElement);
   */
  function autoTopList(playlists) {
    if (!playlists) {
      console.log("❌ autoTopList(playlists): playlists is null or invalid");
      return;
    }

    // handle MenuType1 vs MenuType2
    const isType2 = playlists.matches(selector_ListType2);
    let listItems = null;
    let selector_SelItems = null;
    let selector_ListItems = null;

    if (isType2) {
      selector_ListItems = selector_ListItemsType2;
      selector_SelItems = selector_SelItemsType2;
    } else {
      selector_ListItems = selector_ListItemsType1;
      selector_SelItems = selector_SelItemsType1;
    }

    // Collect all items
    listItems = Array.from(playlists.querySelectorAll(selector_ListItems));
    console.log("✅ autoTopList(playlists), listItems number: ", listItems.length);

    // Separates the selected ones from the rest
    const selected = listItems.filter((item) => item.querySelector(selector_SelItems));
    const unselected = listItems.filter((item) => !item.querySelector(selector_SelItems));

    if (selected.length > 0) {
      console.log(`✅ autoTopList(playlists), this video belongs to ${selected.length} playlist(s)`);
      // Reinsert in the desired order
      [...selected, ...unselected].forEach((item) => {
        playlists.appendChild(item);
      });

      console.log(`✅ autoTopList(playlists), playlists have been sorted.`);

      const sortedItems = Array.from(playlists.querySelectorAll(selector_ListItems));
      console.log("✅ autoTopList(playlists), sortedItems number: ", sortedItems.length);
    } else {
      console.log(
        "❌ autoTopList(playlists): this video doesn’t belong to any existing playlist or not detected (YTM not supporter). No sorting needed."
      );
    }
  }

  /**
   * Sets focus to the input element with the given ID, resets its value,
   * and dispatches an "input" event to trigger any associated handlers.
   * If the element is not found, logs a message to the console.
   *
   * @param {string} el - The ID of the input element to focus.
   */
  async function setFocus(el) {
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

      const timeout = 100;
      console.log(`✅ "input" found. Set focus! Timeout = ${timeout}`);
      // delay required to set the focus
      await sleep(timeout);
      input.focus();
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
  async function openSaveToPlaylistDialog() {
    const moreActionsButton = document.querySelector(selector_MoreActionMenuButton);

    if (moreActionsButton) {
      console.log("✅ openSaveToPlaylistDialog(), More Actions menu found. Click it", moreActionsButton);
      moreActionsButton.click();

      await sleep(250);

      const SubMenuItems = document.querySelectorAll(selector_MoreActionSubMenuItems);

      console.log(`SubMenuItems`, SubMenuItems);

      for (const item of SubMenuItems) {
        if (SaveToButtonText.includes(item.textContent.trim())) {

          console.log(`✅ Found "Save to playlist" menu item. Click on the link in it.`);

          const link = item.querySelector("a");
          if (link) {
            link.click();
            console.log("✅ Click on <a> inside the item:", link);
          } else {
            console.warn("⚠️ no <a> found in item :", item);
          }
        }
      }
    } else {
      console.error("❌ No 'More actions' button was found.");
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
      !evt.shiftKey &&
      evt.target.tagName !== "INPUT" &&
      evt.target.tagName !== "TEXTAREA" &&
      evt.target.contentEditable !== "true"
    ) {
      // Prevent YouTube from interpreting 'p' in any other way
      evt.preventDefault();
      evt.stopPropagation();

      // Attempt to open the "Save to playlist" dialog
      console.log(`${SHORTKEY} has been pressed. Try to open the menu.`);

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
  function SetKeydownListener(enable) {
    if (!ENABLE_SHORTKEY) return;

    if (enable && !IS_KEYPRESS_LISTENER_ACTIVE) {
      console.log(`✅ Add press P event listerner`);
      document.addEventListener("keydown", handlePlaylistKey, true);
      IS_KEYPRESS_LISTENER_ACTIVE = true;
    } else if (!enable && IS_KEYPRESS_LISTENER_ACTIVE) {
      console.log(`❌ Remove press P event listerner`);
      document.removeEventListener("keydown", handlePlaylistKey, true);
      IS_KEYPRESS_LISTENER_ACTIVE = false;
    }
  }

  /**
   * Pauses execution for a specified duration.
   * @param {number} ms - The number of milliseconds to sleep.
   * @returns {Promise<void>} A promise that resolves after the specified delay.
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
