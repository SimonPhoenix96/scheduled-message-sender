let intervalId = null;

// Function to post message in chat
function postDonationMessage(message, selector, shouldSend = true) {
  try {
    // Find the chat input element
    const chatInput = document.querySelector(selector);
    console.log('All contenteditable elements:', document.querySelectorAll('[contenteditable="true"]'));
    if (!chatInput) {
      console.error('Chat input not found with selector:', selector);
      return false;
    }
    
    // Focus the input
    chatInput.focus();
    
    // For contenteditable elements
    if (chatInput.getAttribute('contenteditable') === 'true') {
      chatInput.textContent = message;
    } else {
      // For regular input elements
      chatInput.value = message;
    }
    
    // Dispatch events to make it look like user input
    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Only send if shouldSend is true
    if (shouldSend) {
      // Find and click the send button, or press Enter
      const sendButton = document.querySelector('button[type="submit"]') || 
                         document.querySelector('button.send') ||
                         document.querySelector('[aria-label="Send message"]');
      
      if (sendButton) {
        sendButton.click();
      } else {
        // If no send button found, try pressing Enter
        chatInput.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error posting donation message:', error);
    return false;
  }
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'start') {
    // Clear any existing interval
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    // Convert minutes to milliseconds
    const intervalMs = request.interval * 60 * 1000;
    
    // Start new interval
    intervalId = setInterval(() => {
      postDonationMessage(request.donationMessage, request.chatSelector);
    }, intervalMs);
    
    // Post immediately on start
    postDonationMessage(request.donationMessage, request.chatSelector);
    
    sendResponse({success: true});
  } else if (request.action === 'stop') {
    // Clear interval
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    
    sendResponse({success: true});
  } else if (request.action === 'testInput') {
    // Test input without sending
    const result = postDonationMessage(request.donationMessage, request.chatSelector, false);
    sendResponse({success: result});
  }
  
  return true; // Keep the message channel open for async response
});

// Check if we should be active when the content script loads
chrome.storage.local.get(['isActive', 'donationMessage', 'interval', 'chatSelector'], function(data) {
  if (data.isActive) {
    // Convert minutes to milliseconds
    const intervalMs = data.interval * 60 * 1000;
    
    // Start interval
    intervalId = setInterval(() => {
      postDonationMessage(data.donationMessage, data.chatSelector || 'input[type="text"]');
    }, intervalMs);
  }
});