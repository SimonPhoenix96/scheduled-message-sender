document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleButton');
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
        
        // Notify the content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: newState ? 'start' : 'stop',
            donationMessage: donationMessageInput.value,
            interval: intervalInput.value,
            chatSelector: chatSelectorInput.value || 'input[type="text"]'
          });
        });
      });
    });
  });