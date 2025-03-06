document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleButton');
    const testButton = document.getElementById('testButton');
    const testConnectionButton = document.getElementById('testConnection');
    const generateMessageButton = document.getElementById('generateMessage');
    const statusDiv = document.getElementById('status');
    const donationMessageInput = document.getElementById('donationMessage');
    const intervalInput = document.getElementById('interval');
    const chatSelectorInput = document.getElementById('chatSelector');
    const useLLMCheckbox = document.getElementById('useLLM');
    const standardMessageGroup = document.getElementById('standardMessageGroup');
    const llmSettingsGroup = document.getElementById('llmSettingsGroup');
    const llmProviderSelect = document.getElementById('llmProvider');
    const apiKeyInput = document.getElementById('apiKey');
    const contextPromptInput = document.getElementById('contextPrompt');
    const donationLinkInput = document.getElementById('donationLink');
    let currentTabId = null;
    
    // Toggle LLM settings visibility
    useLLMCheckbox.addEventListener('change', function() {
      if (this.checked) {
        standardMessageGroup.classList.add('hidden');
        llmSettingsGroup.classList.remove('hidden');
        generateMessageButton.classList.remove('hidden');
      } else {
        standardMessageGroup.classList.remove('hidden');
        llmSettingsGroup.classList.add('hidden');
        generateMessageButton.classList.add('hidden');
      }
    });
    
    // Get current tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        console.error("No active tab found");
        return;
      }
      
      currentTabId = tabs[0].id;
      
      // Load saved settings for this tab
      chrome.storage.local.get([
        'activeTabs', 
        'defaultMessage', 
        'defaultInterval', 
        'defaultSelector',
        'useLLM',
        'llmProvider',
        'apiKey',
        'contextPrompt',
        'donationLink'
      ], function(data) {
        // Set default values
        donationMessageInput.value = data.defaultMessage || 'Please support me at: https://example.com/donate';
        intervalInput.value = data.defaultInterval || 15;
        chatSelectorInput.value = data.defaultSelector || '#chat-input-wrapper > div > div.editor-input > p';
        
        // Set LLM settings
        useLLMCheckbox.checked = data.useLLM || false;
        llmProviderSelect.value = data.llmProvider || 'openai';
        apiKeyInput.value = data.apiKey || '';
        contextPromptInput.value = data.contextPrompt || '';
        donationLinkInput.value = data.donationLink || '';
        
        // Toggle visibility based on LLM setting
        if (useLLMCheckbox.checked) {
          standardMessageGroup.classList.add('hidden');
          llmSettingsGroup.classList.remove('hidden');
          generateMessageButton.classList.remove('hidden');
        }
        
        // Override with tab-specific settings if available
        if (data.activeTabs && data.activeTabs[currentTabId]) {
          const tabSettings = data.activeTabs[currentTabId];
          donationMessageInput.value = tabSettings.message || donationMessageInput.value;
          intervalInput.value = tabSettings.interval || intervalInput.value;
          chatSelectorInput.value = tabSettings.selector || chatSelectorInput.value;
          
          if (tabSettings.llmSettings) {
            useLLMCheckbox.checked = tabSettings.llmSettings.useLLM;
            llmProviderSelect.value = tabSettings.llmSettings.provider;
            apiKeyInput.value = tabSettings.llmSettings.apiKey;
            contextPromptInput.value = tabSettings.llmSettings.context;
            donationLinkInput.value = tabSettings.llmSettings.donationLink;
            
            if (tabSettings.llmSettings.useLLM) {
              standardMessageGroup.classList.add('hidden');
              llmSettingsGroup.classList.remove('hidden');
              generateMessageButton.classList.remove('hidden');
            }
          }
          
          // Update UI to show active state
          statusDiv.textContent = 'Status: Active';
          statusDiv.className = 'status active';
          toggleButton.textContent = 'Stop Posting';
        } else {
          // Tab is not active
          statusDiv.textContent = 'Status: Inactive';
          statusDiv.className = 'status inactive';
          toggleButton.textContent = 'Start Posting';
        }
      });
    });
    
    // Generate test message button
    generateMessageButton.addEventListener('click', function() {
      const provider = llmProviderSelect.value;
      const apiKey = apiKeyInput.value;
      const context = contextPromptInput.value;
      const donationLink = donationLinkInput.value;
      
      if (!apiKey) {
        statusDiv.textContent = 'Error: API Key is required';
        statusDiv.className = 'status inactive';
        return;
      }
      
      if (!donationLink) {
        statusDiv.textContent = 'Error: Donation Link is required';
        statusDiv.className = 'status inactive';
        return;
      }
      
      statusDiv.textContent = 'Generating message...';
      statusDiv.className = 'status active';
      
      // Call background script to generate message
      chrome.runtime.sendMessage({
        action: 'generateMessage',
        provider: provider,
        apiKey: apiKey,
        context: context,
        donationLink: donationLink
      }, function(response) {
        if (response && response.message) {
          donationMessageInput.value = response.message;
          statusDiv.textContent = 'Message generated successfully!';
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
          statusDiv.textContent = 'Error: ' + (response?.error || 'Failed to generate message');
          statusDiv.className = 'status inactive';
        }
      });
    });
    
    // Toggle button click handler
    toggleButton.addEventListener('click', function() {
      chrome.storage.local.get('activeTabs', function(data) {
        const activeTabs = data.activeTabs || {};
        const isActive = !!activeTabs[currentTabId];
        const newState = !isActive;
        
        // Save LLM settings
        const llmSettings = {
          useLLM: useLLMCheckbox.checked,
          provider: llmProviderSelect.value,
          apiKey: apiKeyInput.value,
          context: contextPromptInput.value,
          donationLink: donationLinkInput.value
        };
        
        if (newState) {
          // Activate for this tab
          activeTabs[currentTabId] = {
            message: donationMessageInput.value,
            interval: intervalInput.value,
            selector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p',
            llmSettings: llmSettings
          };
        } else {
          // Deactivate for this tab
          delete activeTabs[currentTabId];
        }
        
        // Save settings
        chrome.storage.local.set({
          activeTabs: activeTabs,
          defaultMessage: donationMessageInput.value,
          defaultInterval: intervalInput.value,
          defaultSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p',
          useLLM: llmSettings.useLLM,
          llmProvider: llmSettings.provider,
          apiKey: llmSettings.apiKey,
          contextPrompt: llmSettings.context,
          donationLink: llmSettings.donationLink
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
          donationMessage: donationMessageInput.value,
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
                  statusDiv.className =