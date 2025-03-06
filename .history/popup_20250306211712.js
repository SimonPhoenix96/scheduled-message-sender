document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleButton');
    const testButton = document.getElementById('testButton');
    const testConnectionButton = document.getElementById('testConnection');
    const generateMessageButton = document.getElementById('generateMessage');
    const statusDiv = document.getElementById('status');
    const intervalInput = document.getElementById('interval');
    const chatSelectorInput = document.getElementById('chatSelector');
    const useLLMCheckbox = document.getElementById('useLLM');
    const llmSettingsGroup = document.getElementById('llmSettingsGroup');
    const llmProviderSelect = document.getElementById('llmProvider');
    const apiKeyInput = document.getElementById('apiKey');
    const contextPromptInput = document.getElementById('contextPrompt');
    const messagesContainer = document.getElementById('messagesContainer');
    const addMessageBtn = document.getElementById('addMessageBtn');
    const streamerInfoDiv = document.getElementById('streamerInfo');
    const activeTabsList = document.getElementById('activeTabsList');
    
    let currentTabId = null;
    let currentTabUrl = '';
    let currentTabTitle = '';
    let messageCount = 0;
    
    // Toggle LLM settings visibility
    useLLMCheckbox.addEventListener('change', function() {
      if (this.checked) {
        llmSettingsGroup.classList.remove('hidden');
        generateMessageButton.classList.remove('hidden');
      } else {
        llmSettingsGroup.classList.add('hidden');
        generateMessageButton.classList.add('hidden');
      }
    });
    
    // Add message button handler
    addMessageBtn.addEventListener('click', function() {
      addMessageField();
    });


    // Function to save current settings
function saveCurrentSettings() {
    const messages = getAllMessages();
    
    chrome.storage.local.get(['activeTabs'], function(data) {
      const activeTabs = data.activeTabs || {};
      
      // If this tab is active, update its settings
      if (activeTabs[currentTabId]) {
        activeTabs[currentTabId].messages = messages;
        activeTabs[currentTabId].interval = intervalInput.value;
        activeTabs[currentTabId].selector = chatSelectorInput.value;
        activeTabs[currentTabId].llmSettings = {
          useLLM: useLLMCheckbox.checked,
          provider: llmProviderSelect.value,
          apiKey: apiKeyInput.value,
          context: contextPromptInput.value
        };
      }
      
      // Save to storage
      chrome.storage.local.set({
        activeTabs: activeTabs,
        defaultInterval: intervalInput.value,
        defaultSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p',
        useLLM: useLLMCheckbox.checked,
        llmProvider: llmProviderSelect.value,
        apiKey: apiKeyInput.value,
        contextPrompt: contextPromptInput.value
      });
    });
  }
    
// Function to add a new message field
function addMessageField(message = '', interval = 15, selector = '') {
    const messageId = 'message_' + Date.now() + '_' + messageCount++;
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container';
    messageContainer.id = messageId + '_container';
    
    const messageLabel = document.createElement('label');
    messageLabel.textContent = 'Message:';
    messageLabel.htmlFor = messageId;
    
    const messageTextarea = document.createElement('textarea');
    messageTextarea.id = messageId;
    messageTextarea.className = 'message-input';
    messageTextarea.rows = 3;
    messageTextarea.placeholder = 'Enter your message here';
    messageTextarea.value = message;
    
    // Interval container
    const intervalContainer = document.createElement('div');
    intervalContainer.className = 'message-interval-container';
    
    const intervalLabel = document.createElement('label');
    intervalLabel.textContent = 'Interval (minutes):';
    intervalLabel.htmlFor = messageId + '_interval';
    
    const intervalInput = document.createElement('input');
    intervalInput.type = 'number';
    intervalInput.id = messageId + '_interval';
    intervalInput.className = 'message-interval';
    intervalInput.min = '1';
    intervalInput.value = interval;
    
    intervalContainer.appendChild(intervalLabel);
    intervalContainer.appendChild(intervalInput);
    
    // Selector container
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'message-selector-container';
    
    const selectorLabel = document.createElement('label');
    selectorLabel.textContent = 'Chat Selector (optional):';
    selectorLabel.htmlFor = messageId + '_selector';
    
    const selectorInput = document.createElement('input');
    selectorInput.type = 'text';
    selectorInput.id = messageId + '_selector';
    selectorInput.className = 'message-selector';
    selectorInput.placeholder = 'Leave empty to use default';
    selectorInput.value = selector;
    
    selectorContainer.appendChild(selectorLabel);
    selectorContainer.appendChild(selectorInput);
    
    const messageActions = document.createElement('div');
    messageActions.className = 'message-actions';
    
// Submit button
const submitBtn = document.createElement('button');
submitBtn.textContent = 'Submit Now';
submitBtn.className = 'submit-message-btn';
submitBtn.addEventListener('click', function() {
  // Get the message text
  const messageText = messageTextarea.value.trim();
  if (!messageText) {
    statusDiv.textContent = 'Error: Message cannot be empty';
    statusDiv.className = 'status inactive';
    return;
  }
  
  // Send to content script
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const selector = selectorInput.value || chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p';
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'submitSingleMessage',
      message: {
        text: messageText,
        selector: selector
      }
    }, function(response) {
      if (response && response.success) {
        statusDiv.textContent = 'Message submitted successfully!';
        statusDiv.className = 'status active';
      } else {
        statusDiv.textContent = 'Failed to submit message';
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
  });
});
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-message-btn';
    removeBtn.addEventListener('click', function() {
      messagesContainer.removeChild(messageContainer);
      // Save settings when removing a message
      saveCurrentSettings();
    });
    
    messageActions.appendChild(submitBtn);
    messageActions.appendChild(removeBtn);
    messageContainer.appendChild(messageLabel);
    messageContainer.appendChild(messageTextarea);
    messageContainer.appendChild(intervalContainer);
    messageContainer.appendChild(selectorContainer);
    messageContainer.appendChild(messageActions);
    
    messagesContainer.appendChild(messageContainer);
    
    return messageTextarea;
  }
// Function to collect all messages with their intervals and selectors
function getAllMessages() {
    const messages = [];
    const messageContainers = document.querySelectorAll('.message-container');
    
    messageContainers.forEach(container => {
      const messageInput = container.querySelector('.message-input');
      const intervalInput = container.querySelector('.message-interval');
      const selectorInput = container.querySelector('.message-selector');
      
      if (messageInput && messageInput.value.trim()) {
        messages.push({
          text: messageInput.value.trim(),
          interval: parseInt(intervalInput?.value || 15),
          selector: selectorInput?.value || ''
        });
      }
    });
    
    return messages;
  }
  
  // Function to update active tabs list
  function updateActiveTabsList() {
    chrome.storage.local.get('activeTabs', function(data) {
      const activeTabs = data.activeTabs || {};
      activeTabsList.innerHTML = '';
      
      let hasActiveTabs = false;
      
      for (const tabId in activeTabs) {
        hasActiveTabs = true;
        const tabInfo = activeTabs[tabId];
        
        const tabItem = document.createElement('div');
        tabItem.className = 'active-tab-item';
        
        const tabTitle = document.createElement('span');
        tabTitle.textContent = tabInfo.title || 'Unknown Stream';
        
        const switchBtn = document.createElement('button');
        switchBtn.textContent = 'Switch';
        switchBtn.addEventListener('click', function() {
          chrome.tabs.update(parseInt(tabId), { active: true });
          window.close();
        });
        
        tabItem.appendChild(tabTitle);
        tabItem.appendChild(switchBtn);
        activeTabsList.appendChild(tabItem);
      }
      
      if (!hasActiveTabs) {
        activeTabsList.innerHTML = '<p>No active streams</p>';
      }
    });
  }
  
  // Get current tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      console.error("No active tab found");
      return;
    }
    
    currentTabId = tabs[0].id;
    currentTabUrl = tabs[0].url;
    currentTabTitle = tabs[0].title;
    
    // Update streamer info
    streamerInfoDiv.textContent = 'Current Stream: ' + currentTabTitle;
    
    // Load saved settings for this tab
    chrome.storage.local.get([
      'activeTabs', 
      'defaultInterval', 
      'defaultSelector',
      'useLLM',
      'llmProvider',
      'apiKey',
      'contextPrompt'
    ], function(data) {
      // Set default values
      intervalInput.value = data.defaultInterval || 15;
      chatSelectorInput.value = data.defaultSelector || '#chat-input-wrapper > div > div.editor-input > p';
            // Set LLM settings
            useLLMCheckbox.checked = data.useLLM || false;
            llmProviderSelect.value = data.llmProvider || 'openai';
            apiKeyInput.value = data.apiKey || '';
            contextPromptInput.value = data.contextPrompt || '';
            
            // Toggle visibility based on LLM setting
            if (useLLMCheckbox.checked) {
              llmSettingsGroup.classList.remove('hidden');
              generateMessageButton.classList.remove('hidden');
            }
            
// Override with tab-specific settings if available
if (data.activeTabs && data.activeTabs[currentTabId]) {
    const tabSettings = data.activeTabs[currentTabId];
    intervalInput.value = tabSettings.interval || intervalInput.value;
    chatSelectorInput.value = tabSettings.selector || chatSelectorInput.value;
    
    // Clear existing message fields
    messagesContainer.innerHTML = '';
    
    // Add message fields for each saved message
    if (tabSettings.messages && tabSettings.messages.length > 0) {
      tabSettings.messages.forEach(msg => {
        addMessageField(msg.text, msg.interval, msg.selector);
      });
    } else {
      // Add at least one empty message field
      addMessageField();
    }
    
              
              if (tabSettings.llmSettings) {
                useLLMCheckbox.checked = tabSettings.llmSettings.useLLM;
                llmProviderSelect.value = tabSettings.llmSettings.provider;
                apiKeyInput.value = tabSettings.llmSettings.apiKey;
                contextPromptInput.value = tabSettings.llmSettings.context;
                
                if (tabSettings.llmSettings.useLLM) {
                  llmSettingsGroup.classList.remove('hidden');
                  generateMessageButton.classList.remove('hidden');
                }
              }
              
              // Update UI to show active state
              statusDiv.textContent = 'Status: Active';
              statusDiv.className = 'status active';
              toggleButton.textContent = 'Stop Posting';
            } else {
              // Tab is not active, add one empty message field
              addMessageField();
              
              // Tab is not active
              statusDiv.textContent = 'Status: Inactive';
              statusDiv.className = 'status inactive';
              toggleButton.textContent = 'Start Posting';
            }
            
            // Update the active tabs list
            updateActiveTabsList();
          });
        });
// Toggle button click handler
toggleButton.addEventListener('click', function() {
    chrome.storage.local.get('activeTabs', function(data) {
      const activeTabs = data.activeTabs || {};
      const isActive = !!activeTabs[currentTabId];
      const newState = !isActive;
      
      // Get all messages with their intervals
      const messages = getAllMessages();
      
      // Validate that we have at least one message
      if (newState && messages.length === 0 && !useLLMCheckbox.checked) {
        statusDiv.textContent = 'Error: Please add at least one message';
        statusDiv.className = 'status inactive';
        return;
      }
      
      // Save LLM settings
      const llmSettings = {
        useLLM: useLLMCheckbox.checked,
        provider: llmProviderSelect.value,
        apiKey: apiKeyInput.value,
        context: contextPromptInput.value
      };
      
      if (newState) {
        // Activate for this tab
        activeTabs[currentTabId] = {
          messages: messages,
          interval: intervalInput.value, // Keep as fallback
          selector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p',
          llmSettings: llmSettings,
          title: currentTabTitle,
          url: currentTabUrl
        };
      } else {
        // Deactivate for this tab
        delete activeTabs[currentTabId];
      }
      
      // Save settings
      chrome.storage.local.set({
        activeTabs: activeTabs,
        defaultInterval: intervalInput.value,
        defaultSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p',
        useLLM: llmSettings.useLLM,
        llmProvider: llmSettings.provider,
        apiKey: llmSettings.apiKey,
        contextPrompt: llmSettings.context
      });
      
      // Update UI
      if (newState) {
        statusDiv.textContent = 'Status: Active';
        statusDiv.className = 'status active';
        toggleButton.textContent = 'Stop Posting';
      } else {
        statusDiv.textContent = 'Status: Inactive';
        statusDiv.className = 'status inactive';
        toggleButton.textContent = 'Start Posting';
      }
            // Send message to content script
            chrome.tabs.sendMessage(currentTabId, {
                action: newState ? 'start' : 'stop',
                messages: messages,
                interval: intervalInput.value,
                chatSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p',
                llmSettings: llmSettings
              }, function(response) {
                // Handle potential error
                if (chrome.runtime.lastError) {
                  console.log("Error sending message:", chrome.runtime.lastError.message);
                  statusDiv.textContent = 'Error: Content script not loaded';
                  statusDiv.className = 'status inactive';
                }
              });
              
              // Update the active tabs list
              updateActiveTabsList();
            });
          });
        
          // Test connection button click handler
          testConnectionButton.addEventListener('click', function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs.length === 0) {
                console.error("No active tab found");
                return;
              }
              
              chrome.tabs.sendMessage(tabs[0].id, {action: 'ping'}, function(response) {
                if (chrome.runtime.lastError) {
                  console.log("Connection failed:", chrome.runtime.lastError.message);
                  statusDiv.textContent = 'Status: Content script not loaded';
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
                }
              });
            });
          });

          // Add event listeners for auto-saving
function addAutoSaveListeners() {
    // Listen for changes to inputs
    intervalInput.addEventListener('change', saveCurrentSettings);
    chatSelectorInput.addEventListener('change', saveCurrentSettings);
    useLLMCheckbox.addEventListener('change', saveCurrentSettings);
    llmProviderSelect.addEventListener('change', saveCurrentSettings);
    apiKeyInput.addEventListener('change', saveCurrentSettings);
    contextPromptInput.addEventListener('change', saveCurrentSettings);
  }
  
  // Call this function after the DOM is loaded
  addAutoSaveListeners();

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
      defaultInterval: intervalInput.value,
      defaultSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p'
    });
    
    // Send test message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'testInput',
        messages: messages,
        chatSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p',
        llmSettings: {
          useLLM: useLLMCheckbox.checked,
          provider: llmProviderSelect.value,
          apiKey: apiKeyInput.value,
          context: contextPromptInput.value
        }
      }, function(response) {
        if (response && response.success) {
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
    });
  });
            
    // Generate test message button
    generateMessageButton.addEventListener('click', function() {
      const llmSettings = {
        provider: llmProviderSelect.value,
        apiKey: apiKeyInput.value,
        context: contextPromptInput.value
      };
      
      statusDiv.textContent = 'Generating message...';
      
      chrome.runtime.sendMessage({
        action: 'generateMessage',
        provider: llmSettings.provider,
        apiKey: llmSettings.apiKey,
        context: llmSettings.context
      }, function(response) {
        if (response && response.message) {
          // Add the generated message as a new message
          addMessageField(response.message);
          statusDiv.textContent = 'Message generated successfully!';
          statusDiv.className = 'status active';
        } else {
          statusDiv.textContent = 'Error: ' + (response?.error || 'Failed to generate message');
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
    });
  });