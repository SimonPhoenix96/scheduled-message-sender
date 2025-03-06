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

document.addEventListener('DOMContentLoaded', function() {
  // Get references to DOM elements
  useLLMCheckbox = document.getElementById('useLLM');
  llmSettingsGroup = document.getElementById('llmSettingsGroup');
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
          if (activeTabs[currentTabId].messages) {
            activeTabs[currentTabId].messages.forEach(message => {
              addMessageContainer(message.text, message.interval, message.selector);
            });
          }
          
          // Load LLM settings if they exist
          if (activeTabs[currentTabId].llmSettings) {
            const llmSettings = activeTabs[currentTabId].llmSettings;
            useLLMCheckbox.checked = llmSettings.useLLM;
            llmProviderSelect.value = llmSettings.provider;
            apiKeyInput.value = llmSettings.apiKey;
            contextPromptInput.value = llmSettings.context;
            
            // Show/hide LLM settings based on checkbox
            llmSettingsGroup.classList.toggle('hidden', !llmSettings.useLLM);
            generateMessageButton.classList.toggle('hidden', !llmSettings.useLLM);
          }
        } else {
          // Tab is not active, add default message container
          addMessageContainer('', 15, '');
          
          // Load default settings
          chrome.storage.local.get(['defaultInterval', 'defaultSelector', 'useLLM', 'llmProvider', 'apiKey', 'contextPrompt'], function(defaults) {
            if (defaults.defaultInterval) {
              document.querySelector('.interval-input').value = defaults.defaultInterval;
            }
            
            if (defaults.defaultSelector) {
              document.querySelector('.chat-selector').value = defaults.defaultSelector;
            }
            
            if (defaults.useLLM !== undefined) {
              useLLMCheckbox.checked = defaults.useLLM;
              llmSettingsGroup.classList.toggle('hidden', !defaults.useLLM);
              generateMessageButton.classList.toggle('hidden', !defaults.useLLM);
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
  
  // Add event listener for LLM checkbox
  useLLMCheckbox.addEventListener('change', function() {
    llmSettingsGroup.classList.toggle('hidden', !this.checked);
    generateMessageButton.classList.toggle('hidden', !this.checked);
    
    // Save setting
    chrome.storage.local.set({useLLM: this.checked});
  });
  
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
    // Add event listener for add message button
    addMessageBtn.addEventListener('click', function() {
        addMessageContainer('', 15, '');
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
      
      if (response.error) {
        statusDiv.textContent = 'Error: ' + response.error;
        statusDiv.className = 'status inactive';
      } else if (response.message) {
        // Add the generated message to the first message container
        if (messageContainers.length > 0) {
          const firstContainer = messageContainers[0];
          const messageTextarea = firstContainer.querySelector('.message-textarea');
          messageTextarea.value = response.message;
        }
        
        statusDiv.textContent = 'Message generated successfully';
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
      }
    });
  });
  
  // Test button click handler
  testButton.addEventListener('click', function() {
    // Get all messages
    const messages = getAllMessages();
    
    // Validate that we have at least one message
    if (messages.length === 0 && !useLLMCheckbox.checked) {
      statusDiv.textContent = 'Error: Please add at least one message';
      statusDiv.className = 'status inactive';
      return;
    }
    
    // Save current settings
    chrome.storage.local.set({
      defaultInterval: document.querySelector('.interval-input').value,
      defaultSelector: document.querySelector('.chat-selector').value || '#chat-input-wrapper > div > div.editor-input > p'
    });
    
    // First ensure content script is loaded
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content.js']
      }).then(() => {
        console.log('Content script injected for testing input');
        
        // Now test the input
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'testInput',
            messages: messages,
            chatSelector: document.querySelector('.chat-selector').value || '#input', // Try YouTube's selector first
            llmSettings: {
              useLLM: useLLMCheckbox.checked,
              provider: llmProviderSelect.value,
              apiKey: apiKeyInput.value,
              context: contextPromptInput.value
            }
          }, function(response) {
            if (chrome.runtime.lastError) {
              statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
              statusDiv.className = 'status inactive';
            } else if (response && response.success) {
              statusDiv.textContent = 'Test: Input field found and populated!';
              statusDiv.className = 'status active';
            } else {
              statusDiv.textContent = 'Test: Failed to find input field!';
              statusDiv.className = 'status inactive';
            }
            
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
        }, 500); // Add delay to ensure content script is loaded
      }).catch(err => {
        console.error('Failed to inject content script for testing input:', err);
        statusDiv.textContent = 'Error injecting content script: ' + err.message;
        statusDiv.className = 'status inactive';
      });
    });
  });