// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({
      activeTabs: {},  // Object to track active tabs by tabId
      defaultMessage: 'Please support me at: https://example.com/donate',
      defaultInterval: 15,
      defaultSelector: '#chat-input-wrapper > div > div.editor-input > p'
    });
  });
  
  // Listen for tab updates to reinject content script if needed
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      chrome.storage.local.get('activeTabs', function(data) {
        if (data.activeTabs && data.activeTabs[tabId]) {
          chrome.tabs.sendMessage(tabId, {action: 'checkStatus'}, function(response) {
            // If no response, the content script might not be running, so reinject
            if (chrome.runtime.lastError) {
              chrome.scripting.executeScript({
                target: {tabId: tabId},
                files: ['content.js']
              }).then(() => {
                // After injecting, restore the active state for this tab
                chrome.tabs.sendMessage(tabId, {
                  action: 'start',
                  donationMessage: data.activeTabs[tabId].message,
                  interval: data.activeTabs[tabId].interval,
                  chatSelector: data.activeTabs[tabId].selector
                });
              });
            }
          });
        }
      });
    }
  });
  
  // Clean up when tabs are closed
  chrome.tabs.onRemoved.addListener(function(tabId) {
    chrome.storage.local.get('activeTabs', function(data) {
      if (data.activeTabs && data.activeTabs[tabId]) {
        const activeTabs = data.activeTabs;
        delete activeTabs[tabId];
        chrome.storage.local.set({ activeTabs });
      }
    });
  });