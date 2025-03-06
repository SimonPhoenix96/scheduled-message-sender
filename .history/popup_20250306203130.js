document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleButton');
    const testButton = document.getElementById('testButton');
    const testConnectionButton = document.getElementById('testConnection');
    const statusDiv = document.getElementById('status');
    const donationMessageInput = document.getElementById('donationMessage');
    const intervalInput = document.getElementById('interval');
    const chatSelectorInput = document.getElementById('chatSelector');
    let currentTabId = null;
    
    // Get current tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        console.error("No active tab found");
        return;
      }
      
      currentTabId = tabs[0].id;
      
      // Load saved settings for this tab
      chrome.storage.local.get(['activeTabs', 'defaultMessage', 'defaultInterval', 'defaultSelector'], function(data) {
        // Set default values
        donationMessageInput.value = data.defaultMessage || 'Please support me at: https://example.com/donate';
        intervalInput.value = data.defaultInterval || 15;
        chatSelectorInput.value = data.defaultSelector || '#chat-input-wrapper > div > div.editor-input > p';
        
        // Override with tab-specific settings if available
        if (data.activeTabs && data.activeTabs[currentTabId]) {
          const tabSettings = data.activeTabs[currentTabId];
          donationMessageInput.value = tabSettings.message || donationMessageInput.value;
          intervalInput.value = tabSettings.interval || intervalInput.value;
          chatSelectorInput.value = tabSettings.selector || chatSelectorInput.value;
          
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
    
    // Toggle button click handler
    toggleButton.addEventListener('click', function() {
      chrome.storage.local.get('activeTabs', function(data) {
        const activeTabs = data.activeTabs || {};
        const isActive = !!activeTabs[currentTabId];
        const newState = !isActive;
        
        if (newState) {
          // Activate for this tab
          activeTabs[currentTabId] = {
            message: donationMessageInput.value,
            interval: intervalInput.value,
            selector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p'
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
          defaultSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p'
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
          chatSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p'
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
                  statusDiv.className = 'status inactive';
                }
              });
            }, 3000);
          }
        });
      });
    });
  
    // Test button click handler
    testButton.addEventListener('click', function() {
      // Save current settings
      chrome.storage.local.set({
        defaultMessage: donationMessageInput.value,
        defaultSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p'
      });
      
      // Send test message to content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'testInput',
          donationMessage: donationMessageInput.value,
          chatSelector: chatSelectorInput.value || '#chat-input-wrapper > div > div.editor-input > p'
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
  });