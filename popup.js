// Inject content script when popup loads and load prompts
document.addEventListener('DOMContentLoaded', () => {
    loadPrompts();
    injectContentScript();
  });
  
  // Save new prompt
  document.getElementById('promptForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const prompt = {
      input: document.getElementById('input').value,
      content: document.getElementById('content').value,
      tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()),
      id: Date.now()
    };
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      prompts.push(prompt);
      chrome.storage.local.set({ prompts }, () => {
        addPromptToList(prompt);
        e.target.reset(); // Clear form
      });
    });
  });
  
  // Load and display saved prompts
  function loadPrompts() {
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      filterAndDisplayPrompts(prompts);
      enableDragAndDrop();
    });
  }
  
  // Add a prompt to the UI
  function addPromptToList(prompt) {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.id = prompt.id;
    li.innerHTML = `
      <div>
        <strong>${prompt.input}</strong><br>
        ${prompt.content}<br>
        <em>Tags: ${prompt.tags.join(', ')}</em>
      </div>
      <button class="delete-btn" data-id="${prompt.id}">Delete</button>
    `;
    document.getElementById('promptList').appendChild(li);
  
    // Delete button event
    li.querySelector('.delete-btn').addEventListener('click', () => deletePrompt(prompt.id));
  }
  
  // Delete a prompt
  function deletePrompt(id) {
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = (result.prompts || []).filter(p => p.id !== id);
      chrome.storage.local.set({ prompts }, loadPrompts);
    });
  }
  
  // Filter prompts by tag
  document.getElementById('tagFilter').addEventListener('input', (e) => {
    const filterTag = e.target.value.trim().toLowerCase();
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      filterAndDisplayPrompts(prompts, filterTag);
    });
  });
  
  // Filter and display prompts based on tag
  function filterAndDisplayPrompts(prompts, filterTag = '') {
    const list = document.getElementById('promptList');
    list.innerHTML = '';
    const filteredPrompts = filterTag
      ? prompts.filter(p => p.tags.some(tag => tag.toLowerCase().includes(filterTag)))
      : prompts;
    filteredPrompts.forEach(prompt => addPromptToList(prompt));
    enableDragAndDrop(); // Re-enable drag-and-drop after filtering
  }
  
  // Drag-and-drop for reordering and dragging to webpage
  function enableDragAndDrop() {
    const list = document.getElementById('promptList');
    let draggedItem = null;
  
    list.addEventListener('dragstart', (e) => {
      draggedItem = e.target.closest('li');
      if (draggedItem) {
        e.target.classList.add('dragging');
        // Set data for dragging to webpage (input + content + tags)
        const textContent = `${draggedItem.querySelector('strong').textContent}\n${draggedItem.querySelector('div').childNodes[2].textContent}\n${draggedItem.querySelector('em').textContent}`;
        e.dataTransfer.setData('text/plain', textContent);
      }
    });
  
    list.addEventListener('dragend', (e) => {
      e.target.classList.remove('dragging');
      saveNewOrder();
    });
  
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
  
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const target = e.target.closest('li');
      if (target && draggedItem !== target) {
        const allItems = [...list.querySelectorAll('li')];
        const draggedIndex = allItems.indexOf(draggedItem);
        const targetIndex = allItems.indexOf(target);
        if (draggedIndex < targetIndex) {
          target.after(draggedItem);
        } else {
          target.before(draggedItem);
        }
      }
    });
  }
  
  // Save the new order after dragging
  function saveNewOrder() {
    const list = document.getElementById('promptList');
    const items = [...list.querySelectorAll('li')];
    const newOrder = items.map(item => parseInt(item.dataset.id));
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      const reorderedPrompts = newOrder.map(id => prompts.find(p => p.id === id));
      chrome.storage.local.set({ prompts: reorderedPrompts });
    });
  }
  
  // Inject content script into the active tab
  function injectContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      });
    });
  }