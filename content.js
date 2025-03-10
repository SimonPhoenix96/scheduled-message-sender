// Variable to store interval IDs
let intervalIds = [];
// Variable to store LLM settings
let currentLLMSettings = null;
// Variable to track message indices
let messageIndices = {};


let messageData = [];
let isActive = false;



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
  
  // Add a small delay before sending
  setTimeout(() => {
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
      'button.ytd-live-chat-frame', // YouTube specific
      'button#send-button', // Common ID
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
    
    // If no button found, try multiple methods to press Enter
    if (!buttonFound) {
      console.log('No send button found, trying multiple Enter key methods');
      
      // Method 1: KeyboardEvent with keyCode (older approach)
      element.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
      
      // Method 2: KeyboardEvent with key property (modern approach)
      element.dispatchEvent(new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true
      }));
      
      // Method 3: Simulate Enter with input event + Enter
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText'
      }));
      element.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      }));
      
      // Method 4: Try to trigger form submission if element is in a form
      const form = element.closest('form');
      if (form) {
        console.log('Found parent form, attempting to submit');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        try {
          form.submit();
        } catch (e) {
          console.log('Form submit error:', e);
        }
      }
    }
  }, 300); // 300ms delay before sending
  }

    
    return success;
}

// Function to post a message
async function postDonationMessage(message, selector, shouldSend = true, showNotification = true, useLLM = false) {
  console.log('Posting message with selector:', selector, 'useLLM:', useLLM);
  
  // If using LLM, generate a message
  if (useLLM) {
    console.log('Generating message using LLM');
    try {
      // Find the message data that matches this request
      const messageInfo = messageData.find(msg => 
        (message === "" || msg.text === message) && 
        msg.selector === selector && 
        msg.useLLM === useLLM
      );
      
      // Get message-specific context if available
      const messageContext = messageInfo && messageInfo.context ? messageInfo.context : '';
      // Get message-specific provider and model if available
      const messageProvider = (messageInfo && messageInfo.provider) ? messageInfo.provider : 
                        (currentLLMSettings && currentLLMSettings.provider) ? currentLLMSettings.provider : 'openai';
      const messageModel = (messageInfo && messageInfo.model) ? messageInfo.model : '';

      
      console.log('Using message-specific context:', messageContext);
      console.log('Using provider:', messageProvider, 'and model:', messageModel);
      console.log('Original message text:', message);
      
      // Use the original message from messageInfo if our message is empty
      const originalMessageToUse = message || (messageInfo && messageInfo.text ? messageInfo.text : "");
      
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'getNewMessage',
          context: messageContext,
          provider: messageProvider,
          model: messageModel,
          originalMessage: originalMessageToUse
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
        
        // Clear messageData array before adding new messages
        messageData = [];
        
        request.messages.forEach((messageObj, index) => {
          // Initialize message index counter
          messageIndices[index] = 0;
          
// Get the message-specific interval type or use default
const intervalType = messageObj.intervalType || 'minutes';

// Calculate interval in milliseconds based on type
let intervalMs;
if (intervalType === 'random') {
  // For random intervals, calculate a random value between min and max
  const minMs = (messageObj.minInterval || 30) * 1000; // Convert seconds to ms
  const maxMs = (messageObj.maxInterval || 120) * 1000; // Convert seconds to ms
  intervalMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  console.log('Message', index, 'using random interval between', 
              messageObj.minInterval || 30, 'and', messageObj.maxInterval || 120, 'seconds');
} else if (intervalType === 'seconds') {
  intervalMs = messageObj.interval * 1000;
  console.log('Message', index, 'interval:', messageObj.interval, 'seconds');
} else {
  // Default to minutes
  intervalMs = messageObj.interval * 60 * 1000;
  console.log('Message', index, 'interval:', messageObj.interval, 'minutes');
}

// Use message-specific selector or fall back to default
const selector = messageObj.selector || defaultSelector;

// Create interval for this message
let id;
if (intervalType === 'random') {
  // For random intervals, use a recursive setTimeout approach
  const scheduleRandomMessage = () => {
    // Calculate random time for next post
    const minMs = (messageObj.minInterval || 30) * 1000;
    const maxMs = (messageObj.maxInterval || 120) * 1000;
    const randomMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    
    console.log('Scheduling random message in', randomMs/1000, 'seconds');
    
      // Post immediately on first run
      if (messageObj.useLLM) {
        // For LLM messages, wait for generation before posting
        console.log('Waiting for LLM to generate message before first post');
        // Don't post immediately - the first scheduled post will happen after the random interval
      } else {
        // For regular messages, post immediately
        postDonationMessage(messageObj.text, selector, true, true, false);
      } 
    // Schedule next post
    const timeoutId = setTimeout(() => {
      // Post and schedule next
      if (messageObj.useLLM) {
        // For LLM messages, we need to generate a new message each time
        // Pass an empty string as the message to force generation
        postDonationMessage("", selector, true, true, true);
      } else {
        // For regular messages, use the original text
        postDonationMessage(messageObj.text, selector, true, true, false);
      }
      const nextId = scheduleRandomMessage();
      
      // Replace the old ID with the new one in our tracking array
      const oldIdIndex = intervalIds.indexOf(timeoutId);
      if (oldIdIndex !== -1) {
        intervalIds[oldIdIndex] = nextId;
      }
    }, randomMs);
    
    // Store the timeout ID
    intervalIds.push(timeoutId);
    return timeoutId;
  };
  
  // Start the recursive scheduling
  id = scheduleRandomMessage();
} else {
  // Regular interval (minutes or seconds)
  id = setInterval(() => {
    if (messageObj.useLLM) {
      // For LLM messages, we need to generate a new message each time
      // Pass an empty string as the message to force generation
      postDonationMessage("", selector, true, true, true);
    } else {
      // For regular messages, use the original text
      postDonationMessage(messageObj.text, selector, true, true, false);
    }
  }, intervalMs);
  
  // Store the interval ID
  intervalIds.push(id);
  
  // Post immediately on first run
  if (messageObj.useLLM) {
    // For LLM messages, wait for generation before posting
    console.log('Waiting for LLM to generate message before first post');
    // Schedule the first post after a short delay to allow for generation
    setTimeout(() => {
      postDonationMessage("", selector, true, true, true);
    }, 500);
  } else {
    // For regular messages, post immediately
    postDonationMessage(messageObj.text, selector, true, true, false);
  }
}

// Store message data
messageData.push({
  text: messageObj.text,
  selector: selector,
  interval: messageObj.interval,
  intervalType: messageObj.intervalType || 'minutes',
  minInterval: messageObj.minInterval || 30,
  maxInterval: messageObj.maxInterval || 120,
  useLLM: messageObj.useLLM,
  context: messageObj.context || '',
  provider: messageObj.provider || '',
  model: messageObj.model || ''
});

console.log('Interval set for message:', messageObj.text, 'with ID:', id);
          
          console.log('Interval set for message:', messageObj.text, 'with ID:', id);
        });
        
        // Store LLM settings if provided
        if (request.llmSettings) {
          currentLLMSettings = request.llmSettings;
          console.log('LLM settings stored:', currentLLMSettings);
        }
        
        // Set active flag
        isActive = true;
        
        sendResponse({success: true});
      } else if (currentLLMSettings && currentLLMSettings.useLLM) {
        // If using LLM without specific messages
        console.log('Setting up LLM-based message generation');
        
        const intervalMs = request.interval * 60 * 1000;
        console.log('LLM message interval:', request.interval, 'minutes');
        
        const id = setInterval(() => {
          postDonationMessage("", defaultSelector, true, true, true);
        }, intervalMs);
        
        intervalIds.push(id);
        
        // Post immediately
        postDonationMessage("", defaultSelector, true, true, true);
        
        // Set active flag
        isActive = true;
        
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
      
      // Set inactive flag
      isActive = false;
      
      sendResponse({success: true});
    } else if (request.action === 'testInput') {
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
      }else if (currentLLMSettings && currentLLMSettings.useLLM) {
        // If using LLM for testing
        console.log('Testing with LLM-generated message');
        
        // Get the message object if available
        const messageObj = request.messages && request.messages.length > 0 ? request.messages[0] : null;
        
        // We'll generate a message but not send it, and not show notification from inside postDonationMessage
        postDonationMessage(
          "", 
          request.chatSelector, 
          false, 
          false, 
          true
        ).then(success => {
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
