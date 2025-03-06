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
// Replace the section around line 49-81 with this improved logic
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
                addMessageContainer(message.text, message.interval, message.selector);
            });
        } else {
            // No messages yet, add default container
            addMessageContainer('', 15, '');
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
            enableNotifications: enableNotificationsCheckbox.checked, // Pass notification preference
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
// Function to add a message container
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
    const intervalLabel = document.createElement('label');
    intervalLabel.textContent = 'Interval (minutes):';
    
    const intervalInput = document.createElement('input');
    intervalInput.type = 'number';
    intervalInput.className = 'interval-input';
    intervalInput.value = interval;
    intervalInput.min = 1;
    
    // Create chat selector input
    const selectorLabel = document.createElement('label');
    selectorLabel.textContent = 'Chat Selector (optional):';
    
    const selectorInput = document.createElement('input');
    selectorInput.type = 'text';
    selectorInput.className = 'chat-selector';
    selectorInput.value = selector;
    selectorInput.placeholder = 'Leave empty to use default';
    
    // Create LLM checkbox
    const llmCheckboxContainer = document.createElement('div');
    llmCheckboxContainer.className = 'checkbox-group';
    
    const llmCheckbox = document.createElement('input');
    llmCheckbox.type = 'checkbox';
    llmCheckbox.className = 'message-llm-checkbox';
    llmCheckbox.checked = useLLM;
    
    const llmCheckboxLabel = document.createElement('label');
    llmCheckboxLabel.textContent = 'Process with AI before sending';
    
    llmCheckboxContainer.appendChild(llmCheckbox);
    llmCheckboxContainer.appendChild(llmCheckboxLabel);
    
    // Create buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'message-buttons';
    
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Save Message';
    submitButton.className = 'save-message-btn';
    
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.className = 'remove-btn';
    
    // Add event listeners
    submitButton.addEventListener('click', function() {
        const messageText = messageTextarea.value.trim();
        const intervalValue = parseInt(intervalInput.value, 10);
        const selectorValue = selectorInput.value;
        const useLLMValue = llmCheckbox.checked;
        
        // Save this message to storage
        chrome.storage.local.get('activeTabs', function(data) {
            const activeTabs = data.activeTabs || {};
            
            // Initialize this tab's data if it doesn't exist
            if (!activeTabs[currentTabId]) {
                activeTabs[currentTabId] = {
                    url: currentTabUrl,
                    title: currentTabTitle,
                    messages: []
                };
            }
            
            // Add or update the message
            const existingMessageIndex = activeTabs[currentTabId].messages.findIndex(
                msg => msg.text === messageText
            );
            
            const messageData = {
                text: messageText,
                interval: intervalValue,
                selector: selectorValue,
                useLLM: useLLMValue
            };
            
            if (existingMessageIndex >= 0) {
                // Update existing message
                activeTabs[currentTabId].messages[existingMessageIndex] = messageData;
            } else {
                // Add new message
                activeTabs[currentTabId].messages.push(messageData);
            }
            
            // Save to storage
            chrome.storage.local.set({activeTabs: activeTabs}, function() {
                statusDiv.textContent = 'Message saved successfully';
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
        });
    });
    
    removeButton.addEventListener('click', function() {
        container.remove();
        const index = messageContainers.indexOf(container);
        if (index > -1) {
            messageContainers.splice(index, 1);
        }
    });
    
    // Assemble container
    container.appendChild(messageLabel);
    container.appendChild(messageTextarea);
    container.appendChild(intervalLabel);
    container.appendChild(intervalInput);
    container.appendChild(selectorLabel);
    container.appendChild(selectorInput);
    container.appendChild(llmCheckboxContainer);
    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(removeButton);
    container.appendChild(buttonContainer);
    
    // Add to DOM
    messagesContainer.appendChild(container);
    
    // Store reference
    messageContainers.push(container);
}
      
// Function to get all messages
function getAllMessages() {
    return messageContainers.map(container => {
        return {
            text: container.querySelector('.message-textarea').value,
            interval: parseInt(container.querySelector('.interval-input').value, 10),
            selector: container.querySelector('.chat-selector').value,
            useLLM: container.querySelector('.message-llm-checkbox').checked
        };
    }).filter(message => message.text.trim() !== '');
}
      
      // Function to start posting
      function startPosting() {
        // Get all messages
        const messages = getAllMessages();
        
        // Validate that we have at least one message or LLM is enabled
        if (messages.length === 0 && !useLLMCheckbox.checked) {
          statusDiv.textContent = 'Error: Please add at least one message or enable AI generation';
          statusDiv.className = 'status inactive';
          return;
        }
        
        // Get interval from first message container or default
        const interval = messages.length > 0 ? messages[0].interval : 15;
        
        // Get chat selector from first message container or default
        const chatSelector = document.querySelector('.chat-selector').value || '#chat-input-wrapper > div > div.editor-input > p';
        
        // Save settings
        chrome.storage.local.set({
            defaultInterval: interval,
            defaultSelector: chatSelector,
            useLLM: useLLMCheckbox.checked,
            llmProvider: llmProviderSelect.value,
            apiKey: apiKeyInput.value,
            contextPrompt: contextPromptInput.value,
            enableNotifications: enableNotificationsCheckbox.checked
          });
        
        // Send start message to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          // First ensure content script is loaded
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
          }).then(() => {
            // Now start posting
            setTimeout(() => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'start',
                    messages: messages,
                    interval: interval,
                    chatSelector: chatSelector,
                    enableNotifications: enableNotificationsCheckbox.checked,
                    llmSettings: {
                  useLLM: useLLMCheckbox.checked,
                  provider: llmProviderSelect.value,
                  apiKey: apiKeyInput.value,
                  context: contextPromptInput.value
                }
              }, function(response) {
                if (response && response.success) {
                  // Update UI
                  toggleButton.textContent = 'Stop Posting';
                  toggleButton.className = 'stop';
                  statusDiv.textContent = 'Status: Active';
                  statusDiv.className = 'status active';
                  
                  // Save active state
                  chrome.storage.local.get('activeTabs', function(data) {
                    const activeTabs = data.activeTabs || {};
                    
                    activeTabs[tabs[0].id] = {
                      url: tabs[0].url,
                      title: tabs[0].title,
                      messages: messages,
                      interval: interval,
                      selector: chatSelector,
                      llmSettings: {
                        useLLM: useLLMCheckbox.checked,
                        provider: llmProviderSelect.value,
                        apiKey: apiKeyInput.value,
                        context: contextPromptInput.value
                      }
                    };
                    
                    chrome.storage.local.set({activeTabs: activeTabs}, function() {
                      updateActiveTabsList();
                    });
                  });
                } else {
                  statusDiv.textContent = 'Error: Failed to start posting';
                  statusDiv.className = 'status inactive';
                }
              });
            }, 500);
          }).catch(err => {
            console.error('Failed to inject content script for starting:', err);
            statusDiv.textContent = 'Error injecting content script: ' + err.message;
            statusDiv.className = 'status inactive';
          });
        });
      }
      
      // Function to stop posting
      function stopPosting() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'stop'}, function(response) {
            // Update UI
            toggleButton.textContent = 'Start Posting';
            toggleButton.className = '';
            statusDiv.textContent = 'Status: Inactive';
            statusDiv.className = 'status inactive';
            
            // Remove from active tabs
            chrome.storage.local.get('activeTabs', function(data) {
              const activeTabs = data.activeTabs || {};
              
              delete activeTabs[tabs[0].id];
              
              chrome.storage.local.set({activeTabs: activeTabs}, function() {
                updateActiveTabsList();
              });
            });
          });
        });
      }
      
      // Function to update active tabs list
      function updateActiveTabsList() {
        chrome.storage.local.get('activeTabs', function(data) {
          const activeTabs = data.activeTabs || {};
          
          // Clear current list
          activeTabsList.innerHTML = '';
          
          // Check if there are any active tabs
          if (Object.keys(activeTabs).length === 0) {
            activeTabsList.textContent = 'No active streams';
            return;
          }
          
          // Add each active tab to the list
          for (const tabId in activeTabs) {
            const tabInfo = activeTabs[tabId];
            
            const tabItem = document.createElement('div');
            tabItem.className = 'active-tab-item';
            
            const tabTitle = document.createElement('div');
            tabTitle.className = 'active-tab-title';
            tabTitle.textContent = tabInfo.title || 'Unknown';
            
            const tabActions = document.createElement('div');
            tabActions.className = 'active-tab-actions';
            
            const stopButton = document.createElement('button');
            stopButton.textContent = 'Stop';
            stopButton.className = 'stop-tab-btn';
            stopButton.dataset.tabId = tabId;
            
            // Add event listener for stop button
            stopButton.addEventListener('click', function() {
              const tabIdToStop = this.dataset.tabId;
              
              chrome.tabs.sendMessage(parseInt(tabIdToStop, 10), {action: 'stop'}, function() {
                // Remove from active tabs
                chrome.storage.local.get('activeTabs', function(data) {
                  const activeTabs = data.activeTabs || {};
                  
                  delete activeTabs[tabIdToStop];
                  
                  chrome.storage.local.set({activeTabs: activeTabs}, function() {
                    updateActiveTabsList();
                    
                    // Update UI if this is the current tab
                    if (tabIdToStop == currentTabId) {
                      toggleButton.textContent = 'Start Posting';
                      toggleButton.className = '';
                      statusDiv.textContent = 'Status: Inactive';
                      statusDiv.className = 'status inactive';
                    }
                  });
                });
              });
            });
            
            tabActions.appendChild(stopButton);
            tabItem.appendChild(tabTitle);
            tabItem.appendChild(tabActions);
            activeTabsList.appendChild(tabItem);
          }
        });
      }
    });
            