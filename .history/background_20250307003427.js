// Modify the showNotification function in background.js
function showNotification(title, message) {
    // Check if notifications are enabled
    chrome.storage.local.get('enableNotifications', function(data) {
      if (data.enableNotifications !== false) {  // Default to true if not set
        console.log('Showing notification:', title, message);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: title,
          message: message,
          priority: 2
        });
      } else {
        console.log('Notifications disabled, not showing:', title);
      }
    });
  }






// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({
      activeTabs: {},  // Object to track active tabs by tabId
      defaultInterval: 15,
      defaultSelector: 'body > div > nav > div.flex.grow.items-center.justify-center.lg\:absolute.lg\:inset-x-96.lg\:inset-y-0 > div > div > input',
      useLLM: false,
      llmProvider: 'openai',
      apiKey: '',
      contextPrompt: ''
    });
    console.log('Extension installed, default settings initialized');
  });
  
  // Listen for content script ready messages
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'contentScriptReady') {
      console.log('Content script is ready in tab:', sender.tab.id);
      sendResponse({success: true});
      return true;
    }
  });
  
  // Listen for tab updates to reinject content script if needed
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      console.log('Tab updated to complete state:', tabId);
      
      // Always try to inject the content script on page load
      chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ['content.js']
      }).then(() => {
        console.log('Content script injected successfully in tab:', tabId);
        
        // Check if this tab is active in our extension
        chrome.storage.local.get('activeTabs', function(data) {
          if (data.activeTabs && data.activeTabs[tabId]) {
            const tabSettings = data.activeTabs[tabId];
            console.log('Restoring active state for tab:', tabId);
            
            // Add a delay to ensure content script is fully loaded
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, {
                action: 'start',
                messages: tabSettings.messages,
                interval: tabSettings.interval,
                chatSelector: tabSettings.selector,
                llmSettings: tabSettings.llmSettings
              });
            }, 1000);
          }
        });
      }).catch(err => {
        console.error('Failed to inject content script:', err);
      });
    }
  });
  
  // Clean up when tabs are closed
  chrome.tabs.onRemoved.addListener(function(tabId) {
    chrome.storage.local.get('activeTabs', function(data) {
      if (data.activeTabs && data.activeTabs[tabId]) {
        const activeTabs = data.activeTabs;
        delete activeTabs[tabId];
        chrome.storage.local.set({ activeTabs });
        console.log('Removed closed tab from active tabs:', tabId);
      }
    });
  });
  
  // Handle message generation requests
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {



  if (request.action === 'testApiKey') {
    console.log('Testing API key for provider:', request.provider);
    
    testApiKey(request.provider, request.apiKey)
      .then(result => {
        sendResponse({success: true, message: 'API key is valid'});
      })
      .catch(error => {
        console.error('API key test failed:', error);
        sendResponse({success: false, error: error.message});
      });
    
    return true; // Keep the message channel open for async response
  }



    if (request.action === 'getNewMessage') {
      console.log('Received request to generate new message');
      
      // Get provider and model from request or use defaults
      const provider = request.provider || 'openai';
      const model = request.model || '';
      
      // Get API key for the provider
      chrome.storage.local.get([provider + 'Key'], function(data) {
        const apiKey = data[provider + 'Key'];
        
        if (!apiKey) {
          console.error('No API key found for provider:', provider);
          sendResponse({
            error: 'No API key found for ' + provider,
            fallbackMessage: 'Hello! Thanks for watching the stream!'
          });
          return;
        }
        
        // Generate message using the specified provider, model and context
        generateMessage(provider, apiKey, request.context || '', model)
          .then(message => {
            sendResponse({message: message});
          })
          .catch(error => {
            console.error('Error generating message:', error);
            sendResponse({
              error: error.message,
              fallbackMessage: 'Hello! Thanks for watching the stream!'
            });
          });
      });
      
      return true; // Keep the message channel open for async response
    }else if (request.action === 'getNewMessage') {
      const tabId = sender.tab.id;
      
      chrome.storage.local.get(['activeTabs', 'openaiKey', 'openrouterKey', 'contextPrompt'], function(data) {
        if (data.activeTabs && data.activeTabs[tabId]) {
          // Find the message that has useLLM set to true
          const messageWithLLM = data.activeTabs[tabId].messages.find(msg => msg.useLLM);
          
          if (messageWithLLM) {
            // Get the provider from tab settings or default to openai
            const provider = data.activeTabs[tabId].llmSettings?.provider || 'openai';
            
            // Try to get API key from tab settings, or fall back to stored keys
            let apiKey = data.activeTabs[tabId].llmSettings?.apiKey;
            if (!apiKey) {
              apiKey = data[provider + 'Key'];
            }
            
            // Try to get context from tab settings, or fall back to stored context
            let context = data.activeTabs[tabId].llmSettings?.context;
            if (!context) {
              context = data.contextPrompt;
            }
            
            if (apiKey) {
              generateMessage(provider, apiKey, context).then(message => {
                sendResponse({message: message});
              }).catch(error => {
                console.error('Error generating message:', error);
                // Fall back to the message text
                sendResponse({error: error.message, fallbackMessage: messageWithLLM.text});
              });
            } else {
              console.error('No API key found for', provider);
              sendResponse({error: 'No API key found', fallbackMessage: messageWithLLM.text});
            }
          } else {
            // If no message has useLLM, just return the first message text
            const savedMessage = data.activeTabs[tabId].messages?.[0]?.text || '';
            sendResponse({message: savedMessage});
          }
        } else {
          sendResponse({error: 'No active tab data found'});
        }
      });
      
      return true; // Keep the message channel open for async response
    }
    
    if (request.action === 'showNotification') {
      showNotification(request.title, request.message);
      sendResponse({success: true});
      return true;
    }
  });
  
  // Function to generate messages using LLM APIs
// Function to generate messages using LLM APIs
async function generateMessage(provider, apiKey, context, model = '') {
    try {
      let apiUrl, requestBody, headers;
      
      // Prepare the prompt
      const prompt = `Generate a unique, friendly, and engaging message for a live stream chat. 
  Context about the stream: ${context || "This is a general live stream"}
  
  The message should:
  1. Be conversational and natural
  2. Be between 1-3 sentences
  3. Be relevant to the stream context
  4. Be friendly and positive
  5. Not be repetitive if used multiple times
  
  Generate only the message text without any additional formatting or explanation.`;
      
      if (provider === 'openai') {
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };
        requestBody = {
          model: model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates friendly chat messages for streamers.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        };
      } else if (provider === 'openrouter') {
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://scheduled-message-sender.extension'
        };
        requestBody = {
          model: model || 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates friendly chat messages for streamers.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        };
      } else {
        throw new Error('Unsupported provider');
      }
      
      // Make the API request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract the generated message
      let generatedMessage;
      if (provider === 'openai' || provider === 'openrouter') {
        generatedMessage = data.choices[0].message.content.trim();
      }
      
      return generatedMessage;
    } catch (error) {
      console.error('Error generating message:', error);
      throw error;
    }
  }