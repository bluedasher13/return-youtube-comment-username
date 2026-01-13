import { getRunningRuntime } from "crx-monkey";
import { getUserName } from "./utils/getUserName";
import { formatUserName } from "./utils/formatUserName";
import { syncSettings } from "./types/SyncSettings";
import { RycuSettings } from "./types/RycuSettings";

if (getRunningRuntime() === "Extension") {
  syncSettings(parent.window.__rycu.settings);
}

chrome.storage.onChanged.addListener((changes, area) => {
  console.log("Storage changed:", changes, area);
  if (area !== "local") return;
  if (changes.initialized) {
    syncSettings(parent.window.__rycu.settings);
  }
});

const asyncSyncSettings =
  getRunningRuntime() === "Extension"
    ? async (settings: RycuSettings) => {
        Promise.resolve().then(() => syncSettings(settings));
      }
    : async () => {};

const chat = document.querySelector("#chat");
const cache: Record<string, string> = {};

if (chat !== null) {
  const itemList = chat.querySelector("#item-list");

  if (itemList !== null) {
    startRewriting();

    const itemListOb = new MutationObserver(() => {
      // Change top chat or all chat.
      startRewriting();
    });

    itemListOb.observe(itemList, {
      childList: true,
      attributes: true,
    });
  }
}

function startRewriting() {
  const scroller = document.querySelector("#item-scroller");

  if (scroller !== null) {
    const items = scroller.querySelector("#items");
    if (items !== null) {
      const messageRenderers = document.querySelectorAll(
        "yt-live-chat-text-message-renderer",
      );
      rewrite(messageRenderers);

      const observer = new MutationObserver((record) => {
        const nodes = record[0].addedNodes as NodeListOf<Element>;

        rewrite(nodes);
      });

      observer.observe(items, {
        characterData: true,
        childList: true,
      });
    }
  }
}

function rewrite(nodes: NodeListOf<Element>, async: boolean = true) {
  if (async) {
    asyncSyncSettings(parent.window.__rycu.settings).then(() => {
      handleRewrite(nodes);
    });
  } else {
    if (getRunningRuntime() === "Extension") {
      syncSettings(parent.window.__rycu.settings);
    }

    handleRewrite(nodes);
  }
}

function handleRewrite(nodes: NodeListOf<Element>) {
  const settings = parent.window.__rycu.settings;

  if (!settings.isReplaceLiveChats) {
    return;
  }

  nodes.forEach((node) => {
    const nameElem = node.querySelector("#author-name");
    if (nameElem !== null) {
      const el = nameElem as ShadyElement;
      const msgData = el.__shady.parentNode.host.__dataHost.__data.data;
      const { authorExternalChannelId } = msgData;
      const userHandle = msgData.authorName.simpleText;
      const cachedUserName = cache[authorExternalChannelId];
      const pullUserName =
        cachedUserName !== undefined
          ? Promise.resolve(cachedUserName)
          : getUserName(authorExternalChannelId);

      pullUserName.then((name) => {
        cache[authorExternalChannelId] = name;
        nameElem.textContent = formatUserName(name, userHandle, settings);
      });
    }
  });
}

type ShadyElement = Element & {
  __shady: {
    fa: DocumentFragment;
    parentNode: DocumentFragment & {
      mode: "open";
      host: HostElement;
    };
    previousSibling?: DataHostSiblingElement;
    nextSibling?: DataHostSiblingElement;
  };
};

interface DataHostSiblingElement extends Element {
  __shady: ShadyElement;
  __dataHost: object;
  __domApi: object;
}

interface HostElement extends Element {
  _shady: ShadyElement;
  __dataHost: {
    __data: {
      id: string; // Message ID (e.g. "ChwKGkN...")
      data: {
        id: string; // Message ID (e.g. "ChwKGkN...")
        authorExternalChannelId: string; // Author's channel ID (e.g. "UC...")
        authorName: {
          simpleText: string; // Author's handle (e.g. "@...")
        };
        authorPhoto: {
          thumbnails: {
            url: string; // Author's avatar URL (e.g. "https://yt4.ggpht.com/...");
            width: number | 32;
            height: number | 32;
          }[];
        };
        message: {
          // Message content parts (text and/or emojis)
          runs: (
            | {
                text: string; // Message text content (e.g. "Hello everyone!")
              }
            | {
                emoji: {
                  emojiId: string; // Emoji ID (e.g. unicode: "😀", non-unicode: "Ug...")
                  shortcuts: string[]; // Emoji shortcuts (e.g. unicode: [":grinning_face:", ":grinning:", ":D", ":-D", "=D"] ; non-unicode: [":face-blue-smiling:"], [":_MemberEmoji01:", ":MemberEmoji01:"])
                  searchTerms: string[]; // Emoji search terms (e.g. unicode: ["grinning", "face"], ["face-blue-smiling"] ; non-unicode: ["_MemberEmoji01", "MemberEmoji01"])
                  image: {
                    thumbnails: {
                      url: string; // Emoji image URL (e.g. unicode: "https://fonts.gstatic.com/..." ; non-unicode: "https://yt3.ggpht.com/...");
                      width: number | 24 | 48;
                      height: number | 24 | 48;
                    }[];
                    accessibility: {
                      accessibilityData: {
                        label: string; // Emoji image alt (e.g. unicode: "😀" ; non-unicode: "face-blue-smiling", "MemberEmoji01")
                      };
                    };
                  };
                  isCustomEmoji?: true; // If custom emoji, this property presents and set to true
                };
              }
          )[];
        };
        deletedStateMessage?: {
          runs: {
            text: string; // i18n Message deleted text (e.g. ""[message retracted]")
          }[];
        };
        timestampUsec: string; // Message timestamp (UTC, microseconds)
        contextMenuAccessibility: {
          accessibilityData: {
            label: string; // e.g. "Chat actions"
          };
        };
        authorBadges:
          | []
          | {
              liveChatAuthorBadgeRenderer: {
                customThumbnail: {
                  thumbnails: {
                    url: string; // Author's loyalty badge (e.g. "https://yt3.ggpht.com/...=s16-c-k")
                    width: number | 16 | 32;
                    height: number | 16 | 32;
                  }[];
                };
                tooltip: string; // i18n Author's badge tooltip text | "Member (5 years)";
                accessibility: {
                  accessibilityData: {
                    label: string; // i18n Author's badge aria label | "Member (5 years)";
                  };
                };
              };
            }[];
      };
      authorBadges: HostElement["__dataHost"]["__data"]["data"]["authorBadges"];
      authorIsOwner: boolean;
      authorNameColor: string | "";
      avatarHidden: boolean | false;
      isDeleted: boolean | false;
      isDimmed: boolean | false;
      timestampString: string; // Timestamp string (e.g. "1:00 AM")
    };
    data: HostElement["__dataHost"]["__data"];
    hostElement: Element; // Chat item element
  };
  __CE_shadowRoot: DocumentFragment & {
    mode: "open";
    host: HostElement;
  };
}
