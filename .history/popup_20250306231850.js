// Global variables
let currentTabId;
let currentTabUrl;
let currentTabTitle;
let messageContainers = [];
let useLLMCheckbox;
let llmSettingsGroup;
let llmProviderSelect;
let apiKeyInput;
let contextPromptInput;
let statusDiv;
let streamerInfoDiv;
let activeTabsList;
let toggleButton;
let testButton;
let testConnectionButton;
let generateMessageButton;
let addMessageBtn;
let intervalInput;
let chatSelectorInput;
let enableNotificationsCheckbox;
let settingsBtn;
let settingsPanel;
let openaiKeyInput;
let openrouterKeyInput;
let saveSettingsBtn;
let closeSettingsBtn;



document.addEventListener('DOMContentLoaded', function() {
    llmProviderSelect = document.getElementById('llmProvider');
    apiKeyInput = document.getElementById('apiKey');
    contextPromptInput = document.getElementById('contextPrompt');
    statusDiv = document.getElementById('status');
    streamerInfoDiv = document.getElementById('streamerInfo');
    activeTabsList = document.getElementById('activeTabsList');
    toggleButton = document.getElementById('toggleButton');
    testButton = document.getElementById('testButton');
    testConnectionButton = document.getElementById('testConnection');
    generateMessageButton = document.getElementById('generateMessage');
    addMessageBtn = document.getElementById('addMessageBtn');
    enableNotificationsCheckbox = document.getElementById('enableNotifications');
    settingsBtn = document.getElementById('settingsBtn');
    settingsPanel = document.getElementById('settingsPanel');
    openaiKeyInput = document.getElementById('openaiKey');
    openrouterKeyInput = document.getElementById('openrouterKey');
    contextPromptInput = document.getElementById('contextPrompt');
    saveSettingsBtn = document.getElementById('saveSettingsBtn');
    closeSettingsBtn = document.getElementById('closeSettingsBtn');
  
    

  // Load saved API keys and context
  chrome.storage.local.get(['openaiKey', 'openrouterKey', 'contextPrompt'], function(data) {
    if (data.openaiKey) {
      openaiKeyInput.value = data.openaiKey;
    }
    if (data.openrouterKey) {
      openrouterKeyInput.value = data.openrouterKey;
    }
    if (data.contextPrompt) {
      contextPromptInput.value = data.contextPrompt;
    }
  });

  // Settings button click handler
  settingsBtn.addEventListener('click', function() {
    settingsPanel.classList.remove('hidden');
  });
  
  // Close settings button click handler
  closeSettingsBtn.addEventListener('click', function() {
    settingsPanel.classList.add('hidden');
  });
  
  // Save settings button click handler
  saveSettingsBtn.addEventListener('click', function() {
    chrome.storage.local.set({
      openaiKey: openaiKeyInput.value,
      openrouterKey: openrouterKeyInput.value,
      contextPrompt: contextPromptInput.value
    }, function() {
      statusDiv.textContent = 'Settings saved successfully';
      statusDiv.className = 'status active';
      settingsPanel.classList.add('hidden');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        chrome.storage.local.get('activeTabs', function(data) {
          const isActive = data.activeTabs && data.activeTabs[currentTabId];
          if (isActive) {
            statusDiv.textContent = 'Status: Active';
            statusDiv.className = 'status active';
          } else {
            statusDiv.textContent = 'Status: Inactive';
            statusDiv.className = 'status inactive';
          }
        });
      }, 3000);
    });
  });


  
    // Load saved notification preference
    chrome.storage.local.get('enableNotifications', function(data) {
        if (data.enableNotifications !== undefined) {
          enableNotificationsCheckbox.checked = data.enableNotifications;
        }
      });

        // Add event listener for notification checkbox
  enableNotificationsCheckbox.addEventListener('change', function() {
    chrome.storage.local.set({enableNotifications: this.checked});
  });


  // Get current tab info
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
      currentTabId = tabs[0].id;
      currentTabUrl = tabs[0].url;
      currentTabTitle = tabs[0].title;
      
      // Update streamer info
      streamerInfoDiv.textContent = 'Current Stream: ' + currentTabTitle;
      
      // Check if this tab is already active
      chrome.storage.local.get('activeTabs', function(data) {
        const activeTabs = data.activeTabs || {};
        
        if (activeTabs[currentTabId]) {
          // Tab is active, update UI
          toggleButton.textContent = 'Stop Posting';
          toggleButton.className = 'stop';
          statusDiv.textContent = 'Status: Active';
          statusDiv.className = 'status active';
          
          // Load saved messages for this tab
          if (activeTabs[currentTabId].messages && activeTabs[currentTabId].messages.length > 0) {
            activeTabs[currentTabId].messages.forEach(message => {
              // Make sure to pass the useLLM property
              addMessageContainer(message.text, message.interval, message.selector, message.useLLM);
            });
          } else {
            // No messages yet, add default container
            addMessageContainer('', 15, '', false);
          }
          
          // Load LLM settings if they exist
          if (activeTabs[currentTabId].llmSettings) {
            const llmSettings = activeTabs[currentTabId].llmSettings;
            llmProviderSelect.value = llmSettings.provider;
            apiKeyInput.value = llmSettings.apiKey;
            contextPromptInput.value = llmSettings.context;
          }
        } else {
          // Tab is not active, add default message container
          addMessageContainer('', 15, '', false);
          
          // Load default settings
          chrome.storage.local.get(['defaultInterval', 'defaultSelector', 'llmProvider', 'apiKey', 'contextPrompt'], function(defaults) {
            if (defaults.defaultInterval) {
              document.querySelector('.interval-input').value = defaults.defaultInterval;
            }
            
            if (defaults.defaultSelector) {
              document.querySelector('.chat-selector').value = defaults.defaultSelector;
            }
            
            if (defaults.llmProvider) {
              llmProviderSelect.value = defaults.llmProvider;
            }
            
            if (defaults.apiKey) {
              apiKeyInput.value = defaults.apiKey;
            }
            
            if (defaults.contextPrompt) {
              contextPromptInput.value = defaults.contextPrompt;
            }
          });
        }
      });
    }
  });
  
  // Update active tabs list
  updateActiveTabsList();
  
  // Add event listener for LLM provider select
  llmProviderSelect.addEventListener('change', function() {
    chrome.storage.local.set({llmProvider: this.value});
  });
  
  // Add event listener for API key input
  apiKeyInput.addEventListener('change', function() {
    chrome.storage.local.set({apiKey: this.value});
  });
  
  // Add event listener for context prompt input
  contextPromptInput.addEventListener('change', function() {
    chrome.storage.local.set({contextPrompt: this.value});
  });
  
  // Add message button click handler
  addMessageBtn.addEventListener('click', function() {
    addMessageContainer('', 15, '', false);
  });
      
  // Add event listener for toggle button
  toggleButton.addEventListener('click', function() {
    if (toggleButton.textContent === 'Start Posting') {
      startPosting();
    } else {
      stopPosting();
    }
  });
      
  // Test connection button click handler
  testConnectionButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        console.error("No active tab found");
        statusDiv.textContent = 'Error: No active tab found';
        statusDiv.className = 'status inactive';
        return;
      }
      
      // First try to inject the content script
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content.js']
      }).then(() => {
        console.log('Content script injected for testing');
        
        // Now try to ping it
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'ping'}, function(response) {
            if (chrome.runtime.lastError) {
              console.log("Connection failed:", chrome.runtime.lastError.message);
              statusDiv.textContent = 'Status: Content script not loaded. Error: ' + chrome.runtime.lastError.message;
              statusDiv.className = 'status inactive';
            } else if (response && response.pong) {
              statusDiv.textContent = 'Status: Connected';
              statusDiv.className = 'status active';
              
              // Reset status after 3 seconds
              setTimeout(() => {
                chrome.storage.local.get('activeTabs', function(data) {
                  const isActive = data.activeTabs && data.activeTabs[currentTabId];
                  if (isActive) {
                    statusDiv.textContent = 'Status: Active';
                    statusDiv.className = 'status active';
                  } else {
                    statusDiv.textContent = 'Status: Inactive';
                    statusDiv.className = 'status inactive';
                  }
                });
              }, 3000);
            } else {
              statusDiv.textContent = 'Status: Unknown error';
              statusDiv.className = 'status inactive';
            }
          });
        }, 500); // Add a delay to ensure content script is loaded
      }).catch(err => {
        console.error('Failed to inject content script for testing:', err);
        statusDiv.textContent = 'Error injecting content script: ' + err.message;
        statusDiv.className = 'status inactive';
      });
    });
  });
  
  // Generate test message button click handler
  generateMessageButton.addEventListener('click', function() {
    // Validate API key
    if (!apiKeyInput.value) {
      statusDiv.textContent = 'Error: API key is required';
      statusDiv.className = 'status inactive';
      return;
    }
    
    // Show loading state
    generateMessageButton.textContent = 'Generating...';
    generateMessageButton.disabled = true;
    
    // Request message generation
    chrome.runtime.sendMessage({
      action: 'generateMessage',
      provider: llmProviderSelect.value,
      apiKey: apiKeyInput.value,
      context: contextPromptInput.value
    }, function(response) {
      // Reset button state
      generateMessageButton.textContent = 'Generate Test Message';
      generateMessageButton.disabled = false;