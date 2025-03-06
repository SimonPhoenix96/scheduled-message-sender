// Initialize default settings when extension is installed
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({
      activeTabs: {},  // Object to track active tabs by tabId
      defaultMessage: 'Please support me at: https://example.com/donate',
      defaultInterval: 15,
      defaultSelector: '#chat-input-wrapper > div > div.editor-input > p',
      useLLM: false,
      llmProvider: 'openai',
      apiKey: '',
      contextPrompt: '',
      donationLink: ''
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
                  donationMessage: tabSettings.message,
                  interval: tabSettings.interval,
                  chatSelector: tabSettings.selector,
                  llmSettings: tabSettings.llmSettings
                });
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
      generateDonationMessage(
        request.provider,
        request.apiKey,
        request.context,
        request.donationLink
      ).then(message => {
        sendResponse({message: message});
      }).catch(error => {
        console.error('Error generating message:', error);
        sendResponse({error: error.message || 'Failed to generate message'});
      });
      
      return true; // Keep the message channel open for async response
    }
  });
  
  // Function to generate donation messages using LLM APIs
  async function generateDonationMessage(provider, apiKey, context, donationLink) {
    try {
      let apiUrl, requestBody, headers;
      
      // Prepare the prompt
      const prompt = `Generate a unique, friendly, and engaging donation message for a live stream chat. 
  The message should include this donation link: ${donationLink}
  Context about the stream: ${context || "This is a general live stream"}
  
  The message should:
  1. Be conversational and natural
  2. Be brief (under 150 characters if possible)
  3. Be friendly and not pushy
  4. Include the donation link
  5. Be unique and creative
  6. Possibly include an emoji or two
  
  Example format: "Hey everyone! If you're enjoying the stream, consider supporting at ${donationLink} 💖"
  
  Generate only the message text without any additional commentary.`;
  
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
              content: 'You are a helpful assistant that generates friendly donation messages for streamers.'
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
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'Donation Link Poster'
        };
        requestBody = {
          model: 'openai/gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates friendly donation messages for streamers.'
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
  
  // Update content script to handle LLM-generated messages
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getNewMessage') {
      const tabId = sender.tab.id;
      
      chrome.storage.local.get('activeTabs', function(data) {
        if (data.activeTabs && data.activeTabs[tabId] && data.activeTabs[tabId].llmSettings?.useLLM) {
          const llmSettings = data.activeTabs[tabId].llmSettings;
          
          generateDonationMessage(
            llmSettings.provider,
            llmSettings.apiKey,
            llmSettings.context,
            llmSettings.donationLink
          ).then(message => {
            sendResponse({message: message});
            
            // Also update the stored message
            const activeTabs = data.activeTabs;
            activeTabs[tabId].message = message;
            chrome.storage.local.set({activeTabs: activeTabs});
          }).catch(error => {
            console.error('Error generating message:', error);
            sendResponse({error: error.message, fallbackMessage: data.activeTabs[tabId].message});
          });
        } else {
          // If LLM is not enabled, just return the existing message
          sendResponse({message: data.activeTabs[tabId]?.message || ''});
        }
      });
      
      return true; // Keep the message channel open for async response
    }
  });