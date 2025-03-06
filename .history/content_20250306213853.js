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