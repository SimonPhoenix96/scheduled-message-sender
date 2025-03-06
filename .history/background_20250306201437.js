// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({
      isActive: false,
      donationMessage: 'Please support me at: https://example.com/donate',
      interval: 15,
      chatSelector: '[contenteditable="true"][role="textbox"], input[type="text"]'
    });
  });
  // Listen for tab updates to reinject content script if needed
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      chrome.storage.local.get('isActive', function(data) {
        if (data.isActive) {
            chrome.tabs.sendMessage(tabId, {
                action: "postMessage",
                message: yourMessage,
                selector: "#chat-input-wrapper > div > div.editor-input > p"
              });
        }
      });
    }
  });