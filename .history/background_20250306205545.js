// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({
      activeTabs: {},  // Object to track active tabs by tabId
      defaultInterval: 15,
      defaultSelector: '#chat-input-wrapper > div > div.editor-input > p',
      useLLM: false,
      llmProvider: 'openai',
      apiKey: '',
      contextPrompt: ''
    });
  });
  // Listen for tab updates to reinject content script if needed
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      chrome.storage.local.get('activeTabs', function(data) {
        if (data.activeTabs && data.activeTabs[tabId]) {
          chrome.tabs.sendMessage(tabId, {action: 'checkStatus'}, function(response) {
            // If no response, the content script might not be running, so reinject
            if (chrome.runtime.lastError) {
              chrome.scripting.executeScript({
                target: {tabId: tabId},
                files: ['content.js']
              }).then(() => {
                // After injecting, restore the active state for this tab
                const tabSettings = data.activeTabs[tabId];
                chrome.tabs.sendMessage(tabId, {
                  action: 'start',
                  messages: tabSettings.messages,
                  interval: tabSettings.interval,
                  chatSelector: tabSettings.selector,
                  llmSettings: tabSettings.llmSettings
                });
              }).catch(err => {
                console.error('Failed to inject content script:', err);
              });
            }
          });
        }
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
      }
    });
  });
  
  // Handle message generation requests
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'generateMessage') {
      generateMessage(
        request.provider,
        request.apiKey,
        request.context
      ).then(message => {
        sendResponse({message: message});
      }).catch(error => {
        console.error('Error generating message:', error);
        sendResponse({error: error.message || 'Failed to generate message'});
      });
      
      return true; // Keep the message channel open for async response
    }
  });
  // Function to generate messages using LLM APIs
async function generateMessage(provider, apiKey, context) {
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
          model: 'gpt-3.5-turbo',
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
          model: 'openai/gpt-3.5-turbo',
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