document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleButton');
    const testButton = document.getElementById('testButton');
    const testConnectionButton = document.getElementById('testConnection');
    const generateMessageButton = document.getElementById('generateMessage');
    const statusDiv = document.getElementById('status');
    const intervalInput = document.getElementById('interval');
    const chatSelectorInput = document.getElementById('chatSelector');
    const useLLMCheckbox = document.getElementById('useLLM');
    const llmSettingsGroup = document.getElementById('llmSettingsGroup');
    const llmProviderSelect = document.getElementById('llmProvider');
    const apiKeyInput = document.getElementById('apiKey');
    const contextPromptInput = document.getElementById('contextPrompt');
    const messagesContainer = document.getElementById('messagesContainer');
    const addMessageBtn = document.getElementById('addMessageBtn');
    const streamerInfoDiv = document.getElementById('streamerInfo');
    const activeTabsList = document.getElementById('activeTabsList');
    
    let currentTabId = null;
    let currentTabUrl = '';
    let currentTabTitle = '';
    let messageCount = 0;
    
    // Toggle LLM settings visibility
    useLLMCheckbox.addEventListener('change', function() {
      if (this.checked) {
        llmSettingsGroup.classList.remove('hidden');
        generateMessageButton.classList.remove('hidden');
      } else {
        llmSettingsGroup.classList.add('hidden');
        generateMessageButton.classList.add('hidden');
      }
    });
    
    // Add message button handler
    addMessageBtn.addEventListener('click', function() {
      addMessageField();
    });
    
    // Function to add a new message field
    function addMessageField(message = '') {
      const messageId = 'message_' + Date.now() + '_' + messageCount++;
      
      const messageContainer = document.createElement('div');
      messageContainer.className = 'message-container';
      messageContainer.id = messageId + '_container';
      
      const messageLabel = document.createElement('label');
      messageLabel.textContent = 'Message:';
      messageLabel.htmlFor = messageId;
      
      const messageTextarea = document.createElement('textarea');
      messageTextarea.id = messageId;
      messageTextarea.className = 'message-input';
      messageTextarea.rows = 3;
      messageTextarea.placeholder = 'Enter your message here';
      messageTextarea.value = message;
      
      const messageActions = document.createElement('div');
      messageActions.className = 'message-actions';
      
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.className = 'remove-message-btn';
      removeBtn.addEventListener('click', function() {
        messagesContainer.removeChild(messageContainer);
      });
      
      messageActions.appendChild(removeBtn);
      messageContainer.appendChild(messageLabel);
      messageContainer.appendChild(messageTextarea);
      messageContainer.appendChild(messageActions);
      
      messagesContainer.appendChild(messageContainer);
      
      return messageTextarea;
    }
      // Function to collect all messages
  function getAllMessages() {
    const messages = [];
    const messageInputs = document.querySelectorAll('.message-input');
    
    messageInputs.forEach(input => {
      if (input.value.trim()) {
        messages.push(input.value.trim());
      }
    });
    
    return messages;
  }
  
  // Function to update active tabs list
  function updateActiveTabsList() {
    chrome.storage.local.get('activeTabs', function(data) {
      const activeTabs = data.activeTabs || {};
      activeTabsList.innerHTML = '';
      
      let hasActiveTabs = false;
      
      for (const tabId in activeTabs) {
        hasActiveTabs = true;
        const tabInfo = activeTabs[tabId];
        
        const tabItem = document.createElement('div');
        tabItem.className = 'active-tab-item';
        
        const tabTitle = document.createElement('span');
        tabTitle.textContent = tabInfo.title || 'Unknown Stream';
        
        const switchBtn = document.createElement('button');
        switchBtn.textContent = 'Switch';
        switchBtn.addEventListener('click', function() {
          chrome.tabs.update(parseInt(tabId), { active: true });
          window.close();
        });
        
        tabItem.appendChild(tabTitle);
        tabItem.appendChild(switchBtn);
        activeTabsList.appendChild(tabItem);
      }
      
      if (!hasActiveTabs) {
        activeTabsList.innerHTML = '<p>No active streams</p>';
      }
    });
  }
  
  // Get current tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      console.error("No active tab found");
      return;
    }
    
    currentTabId = tabs[0].id;
    currentTabUrl = tabs[0].url;
    currentTabTitle = tabs[0].title;
    
    // Update streamer info
    streamerInfoDiv.textContent = 'Current Stream: ' + currentTabTitle;
    
    // Load saved settings for this tab
    chrome.storage.local.get([
      'activeTabs', 
      'defaultInterval', 
      'defaultSelector',
      'useLLM',
      'llmProvider',
      'apiKey',
      'contextPrompt'
    ], function(data) {
      // Set default values
      intervalInput.value = data.defaultInterval || 15;
      chatSelectorInput.value = data.defaultSelector || '#chat-input-wrapper > div > div.editor-input > p';