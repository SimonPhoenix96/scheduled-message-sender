document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleButton');
    const testButton = document.getElementById('testButton');
    const statusDiv = document.getElementById('status');
    const donationMessageInput = document.getElementById('donationMessage');
    const intervalInput = document.getElementById('interval');
    const chatSelectorInput = document.getElementById('chatSelector');
    
    // Load saved settings
    chrome.storage.local.get(['isActive', 'donationMessage', 'interval', 'chatSelector'], function(data) {
      if (data.donationMessage) {
        donationMessageInput.value = data.donationMessage;
      }
      
      if (data.interval) {
        intervalInput.value = data.interval;
      }
      
      if (data.chatSelector) {
        chatSelectorInput.value = data.chatSelector;
      }
      
      if (data.isActive) {
        statusDiv.textContent = 'Status: Active';
        statusDiv.className = 'status active';
        toggleButton.textContent = 'Stop Posting';
      } else {
        statusDiv.textContent = 'Status: Inactive';
        statusDiv.className = 'status inactive';
        toggleButton.textContent = 'Start Posting';
      }
    });
    
    // Toggle button click handler
    toggleButton.addEventListener('click', function() {
      chrome.storage.local.get('isActive', function(data) {
        const newState = !data.isActive;
        
        // Save settings
        chrome.storage.local.set({
          isActive: newState,
          donationMessage: donationMessageInput.value,
          interval: intervalInput.value,
          chatSelector: chatSelectorInput.value || 'input[type="text"]'
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
        // Modify line 59-66 in popup.js
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length === 0) {
            console.error("No active tab found");
            return;
            }
            
            chrome.tabs.sendMessage(tabs[0].id, {
            action: newState ? 'start' : 'stop',
            donationMessage: donationMessageInput.value,
            interval: intervalInput.value,
            chatSelector: chatSelectorInput.value || 'input[type="text"]'
            }, function(response) {
            // Handle potential error
            if (chrome.runtime.lastError) {
                console.log("Error sending message:", chrome.runtime.lastError.message);
                // Maybe update UI to show error
                statusDiv.textContent = 'Error: Content script not loaded';
                statusDiv.className = 'status inactive';
            }
            });
        });
      });
    });



    document.getElementById('testConnection').addEventListener('click', function() {
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
            }
          });
        });
      });




    
    // Test button click handler
    testButton.addEventListener('click', function() {
      // Save current settings
      chrome.storage.local.set({
        donationMessage: donationMessageInput.value,
        chatSelector: chatSelectorInput.value || 'input[type="text"]'
      });
      
      // Send test message to content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'testInput',
          donationMessage: donationMessageInput.value,
          chatSelector: chatSelectorInput.value || 'input[type="text"]'
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
            chrome.storage.local.get('isActive', function(data) {
              if (data.isActive) {
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