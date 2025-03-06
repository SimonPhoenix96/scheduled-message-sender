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