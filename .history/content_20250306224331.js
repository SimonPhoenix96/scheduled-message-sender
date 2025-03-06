// Variable to store interval IDs
let intervalIds = [];
// Variable to store LLM settings
let currentLLMSettings = null;
// Variable to track message indices
let messageIndices = {};

// Add at the top of content.js
console.log('Scheduled Message Sender content script loaded');

// Send a message to let the extension know the content script is ready
chrome.runtime.sendMessage({action: 'contentScriptReady'}, function(response) {
  // Handle potential error silently
  if (chrome.runtime.lastError) {
    console.log('Error sending ready message:', chrome.runtime.lastError.message);
  } else {
    console.log('Content script ready message acknowledged');
  }
});

// Function to clear all intervals
function clearAllIntervals() {
  console.log('Clearing all intervals');
  intervalIds.forEach(id => clearInterval(id));
  intervalIds = [];
  messageIndices = {};
}

// Function to debug element information
function debugElementInfo(selector) {
  console.log('Debugging element with selector:', selector);
  const element = document.querySelector(selector);
  if (!element) {
    console.log('Element not found');
    return;
  }
  
  console.log('Element:', element);
  console.log('Element tag:', element.tagName);
  console.log('Element type:', element.type);
  console.log('Element visible:', element.offsetWidth > 0 && element.offsetHeight > 0);
  console.log('Element content:', element.innerHTML || element.value || element.textContent);
}

// Enhanced function to set text in contenteditable elements
function setTextInContentEditable(selector, text) {
  console.log('Attempting to set text in contenteditable with selector:', selector);
  const element = document.querySelector(selector);
  if (!element) {
    console.log('Element not found with selector:', selector);
    return false;
  }
  
  console.log('Found element:', element);
  debugElementInfo(selector);
  
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
    
    // Dispatch input event to trigger any listeners
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('Text set successfully in contenteditable');
    return true;
  } catch (error) {
    console.error('Error setting text in contenteditable:', error);
    return false;
  }
}

// Function to set text in input/textarea elements
function setTextInInput(selector, text) {
  console.log('Attempting to set text in input/textarea with selector:', selector);
  const element = document.querySelector(selector);
  if (!element || (element.tagName !== 'INPUT' && element.tagName !== 'TEXTAREA')) {
    console.log('Input/textarea element not found with selector:', selector);
    return false;
  }
  
  try {
    // Focus the element
    element.focus();
    
    // Set the value
    element.value = text;
    
    // Dispatch input event to trigger any listeners
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('Text set successfully in input/textarea');
    return true;
  } catch (error) {
    console.error('Error setting text in input/textarea:', error);
    return false;
  }
}

// Function to simulate typing like a human
function simulateTyping(selector, text) {
  console.log('Attempting simulated typing with selector:', selector);
  const element = document.querySelector(selector);
  if (!element) {
    console.log('Element not found for simulated typing with selector:', selector);
    return false;
  }
  
  try {
    // Focus the element
    element.focus();
    
    // Clear existing content
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.value = '';
    } else {
      element.innerHTML = '';
    }
    
    // Type characters one by one
    for (let i = 0; i < text.length; i++) {
      setTimeout(() => {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.value += text[i];
        } else {
          document.execCommand('insertText', false, text[i]);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }, i * 30); // 30ms delay between characters
    }
    
    console.log('Simulated typing initiated');
    return true;
  } catch (error) {
    console.error('Error in simulated typing:', error);
    return false;
  }
}
// Enhanced function to set text and send
function setTextAndSend(message, selector, shouldSend = true) {
    console.log('Attempting to set text with selector:', selector);
    
    // Try to find the element with the given selector
    let element = document.querySelector(selector);
    
    // If the selector doesn't work, try some common YouTube chat selectors
    if (!element) {
      console.log('Element not found with provided selector, trying common selectors');
      const commonSelectors = [
        '#input', // YouTube
        '#chat-input', // YouTube
        '#input-message', // YouTube
        'div[contenteditable="true"]', // Generic contenteditable
        'textarea[placeholder*="chat"]', // Generic textarea
        'input[placeholder*="chat"]', // Generic input
        'textarea[placeholder*="message"]',
        'input[placeholder*="message"]',
        '#chat-input-wrapper > div > div.editor-input > p' // Your default
      ];
      
      for (const commonSelector of commonSelectors) {
        element = document.querySelector(commonSelector);
        if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
          console.log('Found element with selector:', commonSelector);
          selector = commonSelector;
          break;
        }
      }
    }
    
    if (!element) {
      console.error('Failed to find any suitable input element');
      return false;
    }
    
    // Try multiple methods to set text
    let success = false;
    
    // Method 1: Set innerHTML/textContent for contenteditable
    if (element.getAttribute('contenteditable') === 'true') {
      try {
        console.log('Trying contenteditable method');
        element.focus();
        element.innerHTML = message;
        element.textContent = message;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        success = true;
      } catch (e) {
        console.log('contenteditable method failed:', e);
      }
    }
    
    // Method 2: Use value property for input/textarea
    if (!success && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
      try {
        console.log('Trying input/textarea value method');
        element.focus();
        element.value = message;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        success = true;
      } catch (e) {
        console.log('input/textarea value method failed:', e);
      }
    }
    
    // Method 3: Use execCommand
    if (!success) {
      try {
        console.log('Trying execCommand method');
        element.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, message);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        success = true;
      } catch (e) {
        console.log('execCommand method failed:', e);
      }
    }

  // Method 4: Simulated typing as last resort
  if (!success) {
    try {
      console.log('Trying simulated typing method');
      success = simulateTyping(selector, message);
    } catch (e) {
      console.log('Simulated typing method failed:', e);
    }
  }
  
  // If we successfully set the text and should send
  if (success && shouldSend) {
    console.log('Text set successfully, attempting to send');
    
    // Try to find and click the send button
    const sendButtonSelectors = [
      'button[type="submit"]',
      'button.send-button',
      'button.chat-send-button',
      'button[data-a-target="chat-send-button"]',
      'button.chat-input__submit-button',
      'button.chat-input-send-button',
      'button[aria-label="Send"]',
      'button[aria-label="Send message"]',
      selector + ' + button',
      selector + ' ~ button'
    ];
    
    let buttonFound = false;
    for (const btnSelector of sendButtonSelectors) {
      const buttons = document.querySelectorAll(btnSelector);
      for (const button of buttons) {
        if (button && button.offsetWidth > 0 && button.offsetHeight > 0) {
          console.log('Found send button:', button);
          button.click();
          buttonFound = true;
          break;
        }
      }
      if (buttonFound) break;
    }
    
    // If no button found, try pressing Enter
    if (!buttonFound) {
      console.log('No send button found, pressing Enter');
      element.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
    }
  }

    
    return success;
}

// Function to post a message
async function postDonationMessage(message, selector, shouldSend = true, showNotification = true, useLLM = false) {
    console.log('Posting message with selector:', selector, 'useLLM:', useLLM);
    
    // If using LLM and message is empty or explicitly requested, generate a message
    if ((useLLM || (message.trim() === '')) && useLLM !== false) {
      console.log('Generating message using LLM');
      try {
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'getNewMessage'
          }, function(response) {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });
        
        if (response.message) {
          message = response.message;
          console.log('Generated message:', message);
        } else if (response.fallbackMessage) {
          message = response.fallbackMessage;
          console.log('Using fallback message:', message);
        } else {
          console.error('Failed to generate message:', response.error);
          return false;
        }
      } catch (error) {
        console.error('Error getting generated message:', error);
        return false;
      }
    }
    
    // If message is still empty, don't proceed
    if (!message || message.trim() === '') {
      console.error('No message to post');
      return false;
    }
    
    const success = setTextAndSend(message, selector, shouldSend);
    if (success && shouldSend && showNotification) {
      // Send notification for successful message post
      chrome.runtime.sendMessage({
        action: 'showNotification',
        title: 'Message Posted',
        message: message.length > 50 ? message.substring(0, 47) + '...' : message
      });
    }
    return success;
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'ping') {
    console.log('Received ping request');
    sendResponse({pong: true});
  } else if (request.action === 'start') {
    console.log('Received start request');
    
    // Clear any existing intervals
    clearAllIntervals();
    
    // Default selector to use if a message doesn't have one
    const defaultSelector = request.chatSelector || '#chat-input-wrapper > div > div.editor-input > p';
    console.log('Using default selector:', defaultSelector);
    
    // Set up intervals for each message
    if (request.messages && request.messages.length > 0) {
      console.log('Setting up intervals for', request.messages.length, 'messages');
      
      request.messages.forEach((messageObj, index) => {
        // Initialize message index counter
        messageIndices[index] = 0;
        
        // Convert minutes to milliseconds
        const intervalMs = messageObj.interval * 60 * 1000;
        console.log('Message', index, 'interval:', messageObj.interval, 'minutes');
        
        // Use message-specific selector or fall back to default
        const selector = messageObj.selector || defaultSelector;
        
        // Create interval for this message
        const id = setInterval(() => {
          postDonationMessage(messageObj.text, selector, true, true, messageObj.useLLM);
        }, intervalMs);
        
        // Store the interval ID
        intervalIds.push(id);
        
        // Post immediately for the first message only
        if (index === 0) {
          postDonationMessage(messageObj.text, selector);
        }
      });
      
      sendResponse({success: true});
    } else if (currentLLMSettings && currentLLMSettings.useLLM) {
      // If using LLM without specific messages
      console.log('Setting up LLM-based message generation');
      
      const intervalMs = request.interval * 60 * 1000;
      console.log('LLM message interval:', request.interval, 'minutes');
      
      const id = setInterval(() => {
        postDonationMessage("", defaultSelector);
      }, intervalMs);
      
      intervalIds.push(id);
      
      // Post immediately
      postDonationMessage("", defaultSelector);
      
      sendResponse({success: true});
    } else {
      console.error('No messages provided and LLM not enabled');
      sendResponse({success: false, error: 'No messages provided and LLM not enabled'});
    }
  } else if (request.action === 'stop') {
    console.log('Received stop request');
    
    // Clear all intervals
    clearAllIntervals();
    
    // Clear LLM settings
    currentLLMSettings = null;
    
    sendResponse({success: true});





  }// In the content.js file, find the testInput action handler (around line 438)
  else if (request.action === 'testInput') {
    console.log('Received test input request');
    
    // Test input without sending
    console.log('Testing input with selector:', request.chatSelector);
    
    // Store LLM settings if provided
    if (request.llmSettings) {
      currentLLMSettings = request.llmSettings;
      console.log('LLM settings stored for testing:', currentLLMSettings);
    }
    
    if (request.messages && request.messages.length > 0) {
      const messageObj = request.messages[0];
      const selector = messageObj.selector || request.chatSelector;
      console.log('Message to insert:', messageObj.text);
      console.log('Using selector:', selector);
      
      // Debug the element we're trying to target
      debugElementInfo(selector);
      
      // Pass false for shouldSend and showNotification to avoid double notifications
      const success = postDonationMessage(messageObj.text, selector, false, false);
      
      // Add notification for test success - this is the ONLY notification that should be sent
      if (success && request.enableNotifications !== false) {
        chrome.runtime.sendMessage({
          action: 'showNotification',
          title: 'Test Message Success',
          message: messageObj.text.length > 50 ? messageObj.text.substring(0, 47) + '...' : messageObj.text
        });
      }
      
      sendResponse({success: success});
    } else if (currentLLMSettings && currentLLMSettings.useLLM) {
      // If using LLM for testing
      console.log('Testing with LLM-generated message');
      
      // We'll generate a message but not send it, and not show notification from inside postDonationMessage
      postDonationMessage("", request.chatSelector, false, false).then(success => {
        // Add notification for LLM test success
        if (success && request.enableNotifications !== false) {
          // Get the generated message from the input field
          const element = document.querySelector(request.chatSelector);
          let message = "";
          if (element) {
            message = element.value || element.textContent || "Generated message";
          } else {
            message = "Generated message";
          }
          
          chrome.runtime.sendMessage({
            action: 'showNotification',
            title: 'Test Message Success (AI)',
            message: message.length > 50 ? message.substring(0, 47) + '...' : message
          });
        }
        
        sendResponse({success: success});
      });
      
      return true; // Keep the message channel open for async response
    } else {
      console.error('No messages provided for testing');
      sendResponse({success: false, error: 'No messages provided for testing'});
    }
  }


});
    