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
    if (messages.length === 0) {
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
            enableNotifications: enableNotificationsCheckbox.checked, // Pass notification preference
            llmSettings: {
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

// Function to add a message container
function addMessageContainer(text = '', interval = 15, selector = '', useLLM = false) {
    const messagesContainer = document.getElementById('messagesContainer');
    
    // Create container
    const container = document.createElement('div');
    container.className = 'message-container';
    
    // Create message textarea
    const messageLabel = document.createElement('label');
    messageLabel.textContent = 'Message:';
    
    const messageTextarea = document.createElement('textarea');
    messageTextarea.className = 'message-textarea';
    messageTextarea.value = text;
    messageTextarea.rows = 3;
        // Create interval input
        const intervalContainer = document.createElement('div');
        intervalContainer.className = 'message-interval-container';
        
        const intervalLabel = document.createElement('label');
        intervalLabel.textContent = 'Interval (minutes):';
        
        const intervalInput = document.createElement('input');
        intervalInput.type = 'number';
        intervalInput.className = 'interval-input';
        intervalInput.value = interval;
        intervalInput.min = 1;
        
        intervalContainer.appendChild(intervalLabel);
        intervalContainer.appendChild(intervalInput);
        
        // Create chat selector input
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'message-selector-container';
        
        const selectorLabel = document.createElement('label');
        selectorLabel.textContent = 'Chat Selector (optional):';
        
        const selectorInput = document.createElement('input');
        selectorInput.type = 'text';
        selectorInput.className = 'chat-selector';
        selectorInput.value = selector;
        selectorInput.placeholder = 'CSS selector for chat input';
        
        selectorContainer.appendChild(selectorLabel);
        selectorContainer.appendChild(selectorInput);
        
        // Create LLM checkbox
        const llmContainer = document.createElement('div');
        llmContainer.className = 'form-group checkbox-group';
        
        const llmCheckbox = document.createElement('input');
        llmCheckbox.type = 'checkbox';
        llmCheckbox.className = 'use-llm-checkbox';
        llmCheckbox.checked = useLLM;
        
        const llmLabel = document.createElement('label');
        llmLabel.textContent = 'Process with AI before sending';
        
        llmContainer.appendChild(llmCheckbox);
        llmContainer.appendChild(llmLabel);
        
        // Create action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        const saveButton = document.createElement('button');
        saveButton.className = 'save-message-btn';
        saveButton.textContent = 'Save Message';
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-message-btn';
        removeButton.textContent = 'Remove';
        
        actionsDiv.appendChild(saveButton);
        actionsDiv.appendChild(removeButton);
        
        // Assemble container
        container.appendChild(messageLabel);
        container.appendChild(messageTextarea);
        container.appendChild(intervalContainer);
        container.appendChild(selectorContainer);
        container.appendChild(llmContainer);
        container.appendChild(actionsDiv);
        
        // Add to DOM
        messagesContainer.appendChild(container);
        
        // Add to our array of containers
        messageContainers.push(container);
        
        // Add event listeners
        removeButton.addEventListener('click', function() {
            messagesContainer.removeChild(container);
            const index = messageContainers.indexOf(container);
            if (index > -1) {
                messageContainers.splice(index, 1);
            }
        });
        
        saveButton.addEventListener('click', function() {
            // Save this message to storage
            saveAllMessages();
            
            // Show success message
            statusDiv.textContent = 'Message saved';
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
        });
    }
    
    // Function to get all messages from the UI
    function getAllMessages() {
        const messages = [];
        
        messageContainers.forEach(container => {
            const messageTextarea = container.querySelector('.message-textarea');
            const intervalInput = container.querySelector('.interval-input');
            const selectorInput = container.querySelector('.chat-selector');
            const useLLMCheckbox = container.querySelector('.use-llm-checkbox');
            
            messages.push({
                text: messageTextarea.value,
                interval: parseInt(intervalInput.value) || 15,
                selector: selectorInput.value,
                useLLM: useLLMCheckbox.checked
            });
        });
        
        return messages;
    }
    
    // Function to save all messages to storage
    function saveAllMessages() {
        const messages = getAllMessages();
        
        chrome.storage.local.get('activeTabs', function(data) {
            const activeTabs = data.activeTabs || {};
            
            // If this tab is already active, update its messages
            if (activeTabs[currentTabId]) {
                activeTabs[currentTabId].messages = messages;
            } else {
                // Otherwise create a new entry
                activeTabs[currentTabId] = {
                    url: currentTabUrl,
                    title: currentTabTitle,
                    messages: messages,
                    llmSettings: {
                        provider: llmProviderSelect.value,
                        apiKey: apiKeyInput.value,
                        context: contextPromptInput.value
                    }
                };
            }
            
            chrome.storage.local.set({activeTabs: activeTabs});
        });
    }
    
    // Function to start posting messages
    function startPosting() {
        // Get all messages
        const messages = getAllMessages();
        
        // Validate that we have at least one message
        if (messages.length === 0) {
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
                console.log('Content script injected');
                
                // Now start the posting
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'start',
                        messages: messages,
                        chatSelector: document.querySelector('.chat-selector').value,
                        enableNotifications: enableNotificationsCheckbox.checked,
                        llmSettings: {
                            provider: llmProviderSelect.value,
                            apiKey: apiKeyInput.value,
                            context: contextPromptInput.value
                        }
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
                            statusDiv.className = 'status inactive';
                        } else if (response && response.success) {
                            // Update UI
                            toggleButton.textContent = 'Stop Posting';
                            toggleButton.className = 'stop';
                            statusDiv.textContent = 'Status: Active';
                            statusDiv.className = 'status active';
                            
                            // Save to storage
                            saveAllMessages();
                            
                            // Update active tabs list
                            updateActiveTabsList();
                        } else {
                            statusDiv.textContent = 'Error: Failed to start posting';
                            statusDiv.className = 'status inactive';
                        }
                    });
                }, 500); // Add delay to ensure content script is loaded
            }).catch(err => {
                console.error('Failed to inject content script:', err);
                statusDiv.textContent = 'Error injecting content script: ' + err.message;
                statusDiv.className = 'status inactive';
            });
        });
    }
    
    // Function to stop posting messages
    function stopPosting() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'stop'}, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error stopping posting:', chrome.runtime.lastError.message);
                    // Still update UI even if there's an error
                    updateUIAfterStop();
                } else if (response && response.success) {
                    updateUIAfterStop();
                } else {
                    console.error('Unknown error stopping posting');
                    updateUIAfterStop();
                }
            });
        });
    }
    
    // Helper function to update UI after stopping
    function updateUIAfterStop() {
        // Update UI
        toggleButton.textContent = 'Start Posting';
        toggleButton.className = '';
        statusDiv.textContent = 'Status: Inactive';
        statusDiv.className = 'status inactive';
        
        // Remove from storage
        chrome.storage.local.get('activeTabs', function(data) {
            const activeTabs = data.activeTabs || {};
            
            if (activeTabs[currentTabId]) {
                delete activeTabs[currentTabId];
                chrome.storage.local.set({activeTabs: activeTabs}, function() {
                    // Update active tabs list
                    updateActiveTabsList();
                });
            }
        });
    }
    
    // Function to update the active tabs list
    function updateActiveTabsList() {
        chrome.storage.local.get('activeTabs', function(data) {
            const activeTabs = data.activeTabs || {};
            const activeTabsList = document.getElementById('activeTabsList');
            
            // Clear current list
            activeTabsList.innerHTML = '';
            
            // Check if we have any active tabs
            const tabIds = Object.keys(activeTabs);
            if (tabIds.length === 0) {
                activeTabsList.textContent = 'No active streams';
                return;
            }
            
            // Add each active tab to the list
            tabIds.forEach(tabId => {
                const tabInfo = activeTabs[tabId];
                
                const tabItem = document.createElement('div');
                tabItem.className = 'active-tab-item';
                
                const tabTitle = document.createElement('span');
                tabTitle.textContent = tabInfo.title || 'Unknown Stream';
                
                const switchButton = document.createElement('button');
                switchButton.textContent = 'Switch';
                switchButton.addEventListener('click', function() {
                    chrome.tabs.update(parseInt(tabId), {active: true});
                });
                
                tabItem.appendChild(tabTitle);
                tabItem.appendChild(switchButton);
                activeTabsList.appendChild(tabItem);
            });
        });
    }