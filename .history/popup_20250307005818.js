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
    // Default to OpenRouter if no provider is selected
    const provider = llmProviderSelect.value || 'openrouter';
    
    // Save all settings
    chrome.storage.local.set({
      openaiKey: openaiKeyInput.value,
      openrouterKey: openrouterKeyInput.value,
      contextPrompt: contextPromptInput.value || 'This is a live stream chat',
      llmProvider: provider
    }, function() {
      // Also update the current API key in the main interface
      apiKeyInput.value = provider === 'openai' ? openaiKeyInput.value : openrouterKeyInput.value;
      
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
        // Make sure to pass all properties
        addMessageContainer(
            message.text, 
            message.interval, 
            message.selector, 
            message.useLLM,
            message.context || '',
            message.provider || '',
            message.model || '',
            message.intervalType || 'minutes',
            message.minInterval || 30,
            message.maxInterval || 120
        );
    });
} else {
    // No messages yet, add default container
    addMessageContainer('', 15, '', false, '', '', '');
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
    const provider = this.value;
    chrome.storage.local.set({llmProvider: provider});
    
    // Update the current API key field based on the selected provider
    if (provider === 'openai') {
      apiKeyInput.value = openaiKeyInput.value;
    } else if (provider === 'openrouter') {
      apiKeyInput.value = openrouterKeyInput.value;
    }
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
                chatSelector: document.querySelector('.chat-selector').value || '#input',
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
function addMessageContainer(text = '', interval = 15, selector = '', useLLM = false, context = '', provider = '', model = '', intervalType = 'minutes', minInterval = 30, maxInterval = 120) {
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
intervalLabel.textContent = 'Interval:';

const intervalInput = document.createElement('input');
intervalInput.type = 'number';
intervalInput.className = 'interval-input';
intervalInput.value = interval;
intervalInput.min = 1;

// Create interval type selector
const intervalTypeSelect = document.createElement('select');
intervalTypeSelect.className = 'interval-type-select';
const typeOptions = [
    { value: 'minutes', text: 'Minutes' },
    { value: 'seconds', text: 'Seconds' },
    { value: 'random', text: 'Random' }
];

typeOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    intervalTypeSelect.appendChild(optionElement);
});

// Set the selected type if provided
if (typeof intervalType === 'string') {
    intervalTypeSelect.value = intervalType;
} else {
    intervalTypeSelect.value = 'minutes'; // Default
}

// Create random interval range container (hidden by default)
const randomRangeContainer = document.createElement('div');
randomRangeContainer.className = 'random-range-container';
randomRangeContainer.style.display = intervalTypeSelect.value === 'random' ? 'flex' : 'none';


intervalInput.style.display = intervalTypeSelect.value === 'random' ? 'none' : 'inline-block';
intervalLabel.style.display = intervalTypeSelect.value === 'random' ? 'none' : 'inline-block';


const minLabel = document.createElement('label');
minLabel.textContent = 'Min (sec):';
minLabel.style.marginRight = '5px';

const minInput = document.createElement('input');
minInput.type = 'number';
minInput.className = 'min-interval-input';
minInput.value = minInterval || 30;
minInput.min = 1;
minInput.style.width = '60px';
minInput.style.marginRight = '10px';

const maxLabel = document.createElement('label');
maxLabel.textContent = 'Max (sec):';
maxLabel.style.marginRight = '5px';

const maxInput = document.createElement('input');
maxInput.type = 'number';
maxInput.className = 'max-interval-input';
maxInput.value = maxInterval || 120;
maxInput.min = 2;
maxInput.style.width = '60px';

// Clear the container before adding elements to prevent duplicates
randomRangeContainer.innerHTML = '';

// Add elements to the container
randomRangeContainer.appendChild(minLabel);
randomRangeContainer.appendChild(minInput);
randomRangeContainer.appendChild(maxLabel);
randomRangeContainer.appendChild(maxInput);

// Add event listener to show/hide random range inputs
intervalTypeSelect.addEventListener('change', function() {
    // Show/hide random range inputs
    randomRangeContainer.style.display = this.value === 'random' ? 'flex' : 'none';
    
    // Show/hide the regular interval input based on selection
    intervalInput.style.display = this.value === 'random' ? 'none' : 'inline-block';
    intervalLabel.style.display = this.value === 'random' ? 'none' : 'inline-block';
});

// Make sure the interval container has proper styling
intervalContainer.style.display = 'flex';
intervalContainer.style.flexWrap = 'wrap';
intervalContainer.style.alignItems = 'center';

// Add the random range container to the interval container
intervalContainer.appendChild(intervalLabel);
intervalContainer.appendChild(intervalInput);
intervalContainer.appendChild(intervalTypeSelect);
intervalContainer.appendChild(randomRangeContainer);
    
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
    
    // Create AI provider selection (new)
    const providerContainer = document.createElement('div');
    providerContainer.className = 'message-provider-container';
    providerContainer.style.display = useLLM ? 'block' : 'none';
    
    const providerLabel = document.createElement('label');
    providerLabel.textContent = 'AI Provider:';
    
    const providerSelect = document.createElement('select');
    providerSelect.className = 'message-provider';

    
    
    // Add provider options
    const openaiOption = document.createElement('option');
    openaiOption.value = 'openai';
    openaiOption.textContent = 'OpenAI';
    
    const openrouterOption = document.createElement('option');
    openrouterOption.value = 'openrouter';
    openrouterOption.textContent = 'OpenRouter';
    
    providerSelect.appendChild(openaiOption);
    providerSelect.appendChild(openrouterOption);
    
    // Set selected provider if provided
    if (provider) {
        providerSelect.value = provider;
    }
    
    providerContainer.appendChild(providerLabel);
    providerContainer.appendChild(providerSelect);
    
    // Create model selection (new)
    const modelContainer = document.createElement('div');
    modelContainer.className = 'message-model-container';
    modelContainer.style.display = useLLM ? 'block' : 'none';
    
    const modelLabel = document.createElement('label');
    modelLabel.textContent = 'AI Model:';
    
    const modelSelect = document.createElement('select');
    modelSelect.className = 'message-model';
    
    // Add default model options for OpenAI
    updateModelOptions(modelSelect, provider || 'openai');
    
    // Set selected model if provided
    if (model) {
        modelSelect.value = model;
    }
    
    modelContainer.appendChild(modelLabel);
    modelContainer.appendChild(modelSelect);
    
    // Add event listener to update model options when provider changes
    providerSelect.addEventListener('change', function() {
        updateModelOptions(modelSelect, this.value);
    });

    // Create custom model input (new)
const customModelContainer = document.createElement('div');
customModelContainer.className = 'custom-model-container';
customModelContainer.style.display = 'none'; // Hidden by default

const customModelLabel = document.createElement('label');
customModelLabel.textContent = 'Custom Model ID:';

const customModelInput = document.createElement('input');
customModelInput.type = 'text';
customModelInput.className = 'custom-model-input';
customModelInput.placeholder = 'Enter model ID (e.g., gpt-4-1106-preview)';

customModelContainer.appendChild(customModelLabel);
customModelContainer.appendChild(customModelInput);

// Add event listener to show/hide custom model input based on model selection
modelSelect.addEventListener('change', function() {
    customModelContainer.style.display = this.value === 'custom' ? 'block' : 'none';
});

// If a custom model was previously saved, select the custom option and show the input
if (model && !['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'openai/gpt-3.5-turbo', 'openai/gpt-4', 
    'anthropic/claude-3-opus', 'anthropic/claude-3-sonnet', 'anthropic/claude-3-haiku', 
    'meta-llama/llama-3-70b-instruct', 'meta-llama/llama-3-8b-instruct'].includes(model)) {
    
    modelSelect.value = 'custom';
    customModelInput.value = model;
    customModelContainer.style.display = 'block';
}
    
    // Create message-specific context input
    const contextContainer = document.createElement('div');
    contextContainer.className = 'message-context-container';
    contextContainer.style.display = useLLM ? 'block' : 'none';
    
    const contextLabel = document.createElement('label');
    contextLabel.textContent = 'Message-specific context:';
    
    const contextInput = document.createElement('textarea');
    contextInput.className = 'message-context';
    contextInput.value = context;
    contextInput.rows = 2;
    contextInput.placeholder = 'Custom context for this message (overrides default)';
    
    contextContainer.appendChild(contextLabel);
    contextContainer.appendChild(contextInput);
    
    // Add event listener to show/hide AI settings based on checkbox
    llmCheckbox.addEventListener('change', function() {
        const display = this.checked ? 'block' : 'none';
        contextContainer.style.display = display;
        providerContainer.style.display = display;
        modelContainer.style.display = display;
    });
    
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
    container.appendChild(providerContainer);
    container.appendChild(modelContainer);
    container.appendChild(customModelContainer); // Add the custom model container
    container.appendChild(contextContainer);
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


// Helper function to update model options based on selected provider
function updateModelOptions(modelSelect, provider) {
    // Clear existing options
    modelSelect.innerHTML = '';
    
    // Add options based on provider
    if (provider === 'openai') {
        const models = [
            { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' },
            { value: 'gpt-4', text: 'GPT-4' },
            { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
            { value: 'custom', text: '-- Custom Model --' }
        ];
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            modelSelect.appendChild(option);
        });
    } else if (provider === 'openrouter') {
        const models = [
            { value: 'openai/gpt-3.5-turbo', text: 'OpenAI GPT-3.5 Turbo' },
            { value: 'openai/gpt-4', text: 'OpenAI GPT-4' },
            { value: 'anthropic/claude-3-opus', text: 'Claude 3 Opus' },
            { value: 'anthropic/claude-3-sonnet', text: 'Claude 3 Sonnet' },
            { value: 'anthropic/claude-3-haiku', text: 'Claude 3 Haiku' },
            { value: 'meta-llama/llama-3-70b-instruct', text: 'Llama 3 70B' },
            { value: 'meta-llama/llama-3-8b-instruct', text: 'Llama 3 8B' },
            { value: 'custom', text: '-- Custom Model --' }
        ];
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            modelSelect.appendChild(option);
        });
    }
}
    
    // Function to get all messages from the UI
    function getAllMessages() {
        const messages = [];
        
        messageContainers.forEach(container => {
            const messageTextarea = container.querySelector('.message-textarea');
            const intervalInput = container.querySelector('.interval-input');
            const intervalTypeSelect = container.querySelector('.interval-type-select');
            const minIntervalInput = container.querySelector('.min-interval-input');
            const maxIntervalInput = container.querySelector('.max-interval-input');
            const selectorInput = container.querySelector('.chat-selector');
            const useLLMCheckbox = container.querySelector('.use-llm-checkbox');
            const contextInput = container.querySelector('.message-context');
            const providerSelect = container.querySelector('.message-provider');
            const modelSelect = container.querySelector('.message-model');
            const customModelInput = container.querySelector('.custom-model-input');
            
            // Determine the model to use
            let modelValue = modelSelect ? modelSelect.value : '';
            if (modelValue === 'custom' && customModelInput && customModelInput.value.trim()) {
                modelValue = customModelInput.value.trim();
            }
            
            // Get interval type and values
            const intervalType = intervalTypeSelect ? intervalTypeSelect.value : 'minutes';
            const minInterval = minIntervalInput ? parseInt(minIntervalInput.value) || 30 : 30;
            const maxInterval = maxIntervalInput ? parseInt(maxIntervalInput.value) || 120 : 120;
            
            messages.push({
                text: messageTextarea.value,
                interval: parseInt(intervalInput.value) || 15,
                intervalType: intervalType,
                minInterval: minInterval,
                maxInterval: maxInterval,
                selector: selectorInput.value,
                useLLM: useLLMCheckbox.checked,
                context: contextInput ? contextInput.value : '',
                provider: providerSelect ? providerSelect.value : '',
                model: modelValue
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
                }, 500);
            }).catch(err => {
                console.error('Failed to inject content script:', err);
                statusDiv.textContent = 'Error injecting content script: ' + err.message;
                statusDiv.className = 'status inactive';
            });
  }); // Added the missing closing parenthesis here
}

        const testOpenaiKeyBtn = document.getElementById('testOpenaiKey');
        const testOpenrouterKeyBtn = document.getElementById('testOpenrouterKey');
        
        // Add event listeners for the test buttons
        testOpenaiKeyBtn.addEventListener('click', function() {
          console.log('Testing OpenAI key:', openaiKeyInput.value.substring(0, 5) + '...');
          testApiKey('openai', openaiKeyInput.value);
        });
        
        testOpenrouterKeyBtn.addEventListener('click', function() {
          console.log('Testing OpenRouter key:', openrouterKeyInput.value.substring(0, 5) + '...');
          testApiKey('openrouter', openrouterKeyInput.value);
        });
        
          // Function to test API keys
          function testApiKey(provider, apiKey) {
            if (!apiKey || apiKey.trim() === '') {
              statusDiv.textContent = `Please enter a ${provider} API key first`;
              statusDiv.className = 'status inactive';
              return;
            }
            
            // Show testing status
            statusDiv.textContent = `Testing ${provider} API key...`;
            statusDiv.className = 'status active';
            
            // Send message to background script to test the key
            chrome.runtime.sendMessage({
              action: 'testApiKey',
              provider: provider,
              apiKey: apiKey
            }, function(response) {
              if (chrome.runtime.lastError) {
                statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
                statusDiv.className = 'status inactive';
                return;
              }
              
              if (response.success) {
                statusDiv.textContent = `${provider} API key is valid!`;
                statusDiv.className = 'status active';
              } else {
                statusDiv.textContent = `${provider} API key error: ${response.error}`;
                statusDiv.className = 'status inactive';
              }
              
              // Reset status after 5 seconds
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
              }, 5000);
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
});  