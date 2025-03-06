// Variable to store interval ID
let intervalId = null;
// Variable to store LLM settings
let currentLLMSettings = null;

// Add at the top of content.js
console.log('Donation Link Poster content script loaded');

// Send a message to let the extension know the content script is ready
chrome.runtime.sendMessage({action: 'contentScriptReady'}, function(response) {
  // Handle potential error silently
  if (chrome.runtime.lastError) {
    console.log('Error sending ready message:', chrome.runtime.lastError.message);
  }
});


// Function to set text and send
function setTextAndSend(message, selector, shouldSend = true) {
    // Try multiple methods to set text in the chat input
    const success = setTextInContentEditable(selector, message) || 
                    setTextInInput(selector, message) || 
                    simulateTyping(selector, message);
    
    if (success && shouldSend) {
      // Try to find and click the send button
      sendMessage(selector);
    }
    
    return success;
  }
  
  // Function to find and click the send button
  function sendMessage(inputSelector) {
    try {
      // Common send button selectors
      const sendButtonSelectors = [
        'button[type="submit"]',
        'button.send-button',
        'button.chat-send-button',
        'button[data-a-target="chat-send-button"]',
        'button.chat-input__submit-button',
        'button.chat-input-send-button',
        inputSelector + ' + button',
        inputSelector + ' ~ button'
      ];
      
      // Try each selector
      for (const selector of sendButtonSelectors) {
        const button = document.querySelector(selector);
        if (button && button.offsetWidth > 0 && button.offsetHeight > 0) {
          console.log('Found send button:', button);
          button.click();
          return true;
        }
      }
      
      // If no button found, try pressing Enter on the input
      const input = document.querySelector(inputSelector);
      if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
        return true;
      }
      
      console.log('No send button found');
      return false;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
  
  // Function to post message in chat
  function postDonationMessage(message, selector, shouldSend = true) {
    try {
      console.log('Attempting to post message with selector:', selector);
      
      // If using LLM, get a fresh message first
      if (currentLLMSettings && currentLLMSettings.useLLM) {
        chrome.runtime.sendMessage({action: 'getNewMessage'}, function(response) {
          if (response && response.message) {
            console.log('Got new LLM-generated message:', response.message);
            setTextAndSend(response.message, selector, shouldSend);
          } else if (response && response.fallbackMessage) {
            console.log('Using fallback message:', response.fallbackMessage);
            setTextAndSend(response.fallbackMessage, selector, shouldSend);
          } else {
            console.error('Failed to get LLM message, using original:', message);
            setTextAndSend(message, selector, shouldSend);
          }
        });
        return true;
      } else {
        // Use the standard message
        return setTextAndSend(message, selector, shouldSend);
      }
    } catch (error) {
      console.error('Error posting message:', error);
      return false;
    }
  }

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
    
    // Dispatch input event to trigger any listeners
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    return true;
  } catch (error) {
    console.error('Error setting text:', error);
    return false;
  }
}

// Function to simulate typing like a human
function simulateTyping(selector, text) {
  const element = document.querySelector(selector);
  if (!element) {
    console.log('Element not found for simulated typing with selector:', selector);
    return false;
  }
  
  try {
    // Focus the element
    element.focus();
    
    // Clear existing content
    element.innerHTML = '';
    
    // Type characters one by one
    for (let i = 0; i < text.length; i++) {
      setTimeout(() => {
        document.execCommand('insertText', false, text[i]);
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }, i * 30); // 30ms delay between characters
    }
    
    return true;
  } catch (error) {
    console.error('Error in simulated typing:', error);
    return false;
  }
}

// Helper function to set text and send
function setTextAndSend(message, selector, shouldSend) {
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
  
  // If all else fails, try to find any input field
  console.log('Contenteditable approach failed, trying to find any input field');
  const inputs = document.querySelectorAll('input[type="text"], textarea');
  
  for (const input of inputs) {
    if (input.offsetWidth > 0 && input.offsetHeight > 0) {
      console.log('Trying visible input element:', input);
      input.focus();
      input.value = message;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      if (shouldSend) {
        input.dispatchEvent(new KeyboardEvent('keydown', {
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
  
  console.error('Failed to find any suitable input element');
  return false;
}

// Function to post message in chat
function postDonationMessage(message, selector, shouldSend = true) {
  try {
    console.log('Attempting to post message with selector:', selector);
    
    // If using LLM, get a fresh message first
    if (currentLLMSettings && currentLLMSettings.useLLM) {
      chrome.runtime.sendMessage({action: 'getNewMessage'}, function(response) {
        if (response && response.message) {
          console.log('Got new LLM-generated message:', response.message);
          setTextAndSend(response.message, selector, shouldSend);
        } else if (response && response.fallbackMessage) {
          console.log('Using fallback message:', response.fallbackMessage);
          setTextAndSend(response.fallbackMessage, selector, shouldSend);
        } else {
          console.error('Failed to get LLM message, using original:', message);
          setTextAndSend(message, selector, shouldSend);
        }
      });
      return true;
    } else {
      // Use the standard message
      return setTextAndSend(message, selector, shouldSend);
    }
  } catch (error) {
    console.error('Error posting donation message:', error);
    return false;
  }
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'ping') {
    sendResponse({pong: true});
  } else if (request.action === 'start') {
    // Store LLM settings if provided
    if (request.llmSettings) {
      currentLLMSettings = request.llmSettings;
    }
    
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
    
    // Clear LLM settings
    currentLLMSettings = null;
    
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