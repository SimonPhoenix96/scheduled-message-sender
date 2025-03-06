let intervalId = null;
// Add at the top of content.js
console.log('Donation Link Poster content script loaded');

// Send a message to let the extension know the content script is ready
chrome.runtime.sendMessage({action: 'contentScriptReady'}, function(response) {
  // Handle potential error silently
  if (chrome.runtime.lastError) {
    console.log('Error sending ready message:', chrome.runtime.lastError.message);
  }
});

// Enhanced function to set text in contenteditable elements
function setTextInContentEditable(selector, text) {
  const element = document.querySelector(selector);
  if (!element) {
    console.log('Element not found with selector:', selector);
    return false;
  }
  
  console.log('Found element:', element);
  
  try {
    // Try multiple approaches to set text
    
    // Clear existing content
    element.innerHTML = '';
    
    // Focus the element
    element.focus();
    
    // Approach 1: Using execCommand
    document.execCommand('insertText', false, text);
    
    // Approach 2: Direct innerHTML setting (backup)
    if (!element.textContent || element.textContent.trim() === '') {
      element.innerHTML = text;
    }
    
    // Approach 3: Using textContent (backup)
    if (!element.textContent || element.textContent.trim() === '') {
      element.textContent = text;
    }
    
    // Dispatch multiple events to simulate real typing
    const events = ['input', 'change', 'keyup'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
    
    console.log('Text set successfully:', text);
    return true;
  } catch (error) {
    console.error('Error setting text:', error);
    return false;
  }
}

// Simulate realistic typing
function simulateTyping(selector, text) {
  const element = document.querySelector(selector);
  if (!element) {
    console.log('Element not found for typing simulation:', selector);
    return false;
  }
  
  // Focus the element first
  element.focus();
  
  // Clear existing content
  element.innerHTML = '';
  
  console.log('Starting typing simulation for:', text);
  
  // Type characters one by one with slight delays
  let index = 0;
  
  function typeNextChar() {
    if (index >= text.length) {
      console.log('Typing simulation completed');
      return true;
    }
    
    // Insert one character
    document.execCommand('insertText', false, text[index]);
    
    // Dispatch input event
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);
    
    index++;
    
    // Schedule next character with random delay (50-150ms)
    const delay = 50 + Math.floor(Math.random() * 100);
    setTimeout(typeNextChar, delay);
  }
  
  typeNextChar();
  return true;
}

// Function to post message in chat
function postDonationMessage(message, selector, shouldSend = true) {
  try {
    console.log('Attempting to post message with selector:', selector);
    
    // Try the specific selector first
    if (setTextInContentEditable(selector, message)) {
      console.log('Successfully set text using the provided selector');
      
      if (shouldSend) {
        // Find the chat input element to send the Enter key event to
        const chatInput = document.querySelector(selector);
        
        // Find and click the send button, or press Enter
        const sendButton = document.querySelector('button[type="submit"]') || 
                           document.querySelector('button.send') ||
                           document.querySelector('[aria-label="Send message"]');
        
        if (sendButton) {
          console.log('Found send button, clicking it');
          sendButton.click();
        } else {
          console.log('No send button found, pressing Enter');
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
    }
    
    // If the specific selector didn't work, try simulated typing
    console.log('Standard text setting failed, trying simulated typing');
    if (simulateTyping(selector, message)) {
      console.log('Simulated typing successful');
      
      if (shouldSend) {
        const chatInput = document.querySelector(selector);
        setTimeout(() => {
          chatInput.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          }));
        }, 500);
      }
      
      return true;
    }
    
    // If the specific selector didn't work, try to find any contenteditable
    console.log('Specific selector failed, trying to find any contenteditable');
    const allContentEditables = document.querySelectorAll('[contenteditable="true"]');
    console.log('Found', allContentEditables.length, 'contenteditable elements');
    
    for (const element of allContentEditables) {
      if (element.offsetWidth > 0 && element.offsetHeight > 0) {
        console.log('Trying visible contenteditable element:', element);
        element.focus();
        element.innerHTML = message;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        if (shouldSend) {
          element.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          }));
        }
        
        return true;
      }
    }
    
    console.error('No suitable input element found');
    return false;
  } catch (error) {
    console.error('Error posting donation message:', error);
    return false;
  }
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Add to your message listener
  if (request.action === 'ping') {
    sendResponse({pong: true});
  } else if (request.action === 'start') {
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
    console.log('Testing input with selector:', request.chatSelector);
    console.log('Message to insert:', request.donationMessage);
    
    // Try to find the element first
    const element = document.querySelector(request.chatSelector);
    if (element) {
      console.log('Found element:', element);
      console.log('Element properties:', {
        tagName: element.tagName,
        contentEditable: element.contentEditable,
        isVisible: element.offsetWidth > 0 && element.offsetHeight > 0,
        disabled: element.disabled
      });
      
      // Try multiple methods to set text
      const success = postDonationMessage(request.donationMessage, request.chatSelector, false);
      sendResponse({success: success});
    } else {
      console.error('Element not found with selector:', request.chatSelector);
      sendResponse({success: false});
    }
  } else if (request.action === 'checkStatus') {
    sendResponse({active: !!intervalId});
  }
  
  return true; // Keep the message channel open for async responses
});