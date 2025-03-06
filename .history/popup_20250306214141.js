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