// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({
      activeTabs: {},  // Object to track active tabs by tabId
      defaultInterval: 15,
      defaultSelector: '#chat-input-wrapper > div > div.editor-input > p',
      useLLM: false,
      llmProvider: 'openai',
      apiKey: '',
      contextPrompt: ''
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
                const tabSettings = data.activeTabs[tabId];
                chrome.tabs.sendMessage(tabId, {
                  action: 'start',
                  messages: tabSettings.messages,
                  interval: tabSettings.interval,
                  chatSelector: tabSettings.selector,
                  llmSettings: tabSettings.llmSettings
                });
              }).catch(err => {
                console.error('Failed to inject content script:', err);
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
  
  // Handle message generation requests
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'generateMessage') {
      generateMessage(
        request.provider,
        request.apiKey,
        request.context
      ).then(message => {
        sendResponse({message: message});
      }).catch(error => {
        console.error('Error generating message:', error);
        sendResponse({error: error.message || 'Failed to generate message'});
      });
      
      return true; // Keep the message channel open for async response
    }
  });