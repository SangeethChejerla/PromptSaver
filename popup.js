document.addEventListener('DOMContentLoaded', () => {
    loadPrompts();
    injectContentScript();
    setupNavigation();
    setupFormSubmission(); // Ensure form submission is set up correctly
  });
  
  // Set up navigation between list and form views
  function setupNavigation() {
    const listHeader = document.getElementById('listHeader');
    const promptsSection = document.getElementById('promptsSection');
    const formHeader = document.getElementById('formHeader');
    const promptForm = document.getElementById('promptForm');
  
    // Show form when "+" is clicked
    document.querySelector('.add-btn').addEventListener('click', () => {
      listHeader.style.display = 'none';
      promptsSection.style.display = 'none';
      formHeader.style.display = 'flex';
      promptForm.style.display = 'block';
      promptForm.reset(); // Clear form
      promptForm.dataset.editingId = ''; // Clear editing state
    });
  
    // Return to list when list icon (📋) is clicked
    document.querySelector('.list-btn').addEventListener('click', () => {
      formHeader.style.display = 'none';
      promptForm.style.display = 'none';
      listHeader.style.display = 'flex';
      promptsSection.style.display = 'block';
      loadPrompts(); // Refresh the list
    });
  }
  
  // Set up form submission for saving prompts
  function setupFormSubmission() {
    const form = document.getElementById('promptForm');
  
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input').value.trim();
      const content = document.getElementById('content').value.trim();
      const tags = document.getElementById('tags').value.trim().split(',').map(tag => tag.trim()).filter(tag => tag);
  
      if (!input || !content || !tags.length) {
        alert('Please fill in all fields (Input, Content, and at least one Tag).');
        return;
      }
  
      const prompt = {
        input,
        content,
        tags,
        id: form.dataset.editingId ? parseInt(form.dataset.editingId) : Date.now()
      };
  
      chrome.storage.local.get(['prompts'], (result) => {
        let prompts = result.prompts || [];
        if (form.dataset.editingId) {
          // Update existing prompt
          const index = prompts.findIndex(p => p.id === parseInt(form.dataset.editingId));
          if (index !== -1) {
            prompts[index] = prompt;
          }
        } else {
          // Add new prompt
          prompts.push(prompt);
        }
        chrome.storage.local.set({ prompts }, () => {
          console.log('Prompt saved successfully:', prompt);
          // After saving, show only the list
          const listHeader = document.getElementById('listHeader');
          const promptsSection = document.getElementById('promptsSection');
          const formHeader = document.getElementById('formHeader');
          const promptForm = document.getElementById('promptForm');
  
          formHeader.style.display = 'none';
          promptForm.style.display = 'none';
          listHeader.style.display = 'flex';
          promptsSection.style.display = 'block';
          loadPrompts();
          form.reset();
          form.dataset.editingId = ''; // Clear editing state
        });
      });
    });
  }
  
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
      <div class="prompt-content" data-full-content="${prompt.content}">
        <strong>${prompt.input}</strong><br>
        ${truncateContent(prompt.content, 3)}<br>
        <em>Tags: ${prompt.tags.join(', ')}</em>
      </div>
      <div class="actions">
        <button class="action-btn copy-btn" data-id="${prompt.id}">Copy</button>
        <button class="action-btn edit-btn" data-id="${prompt.id}">Edit</button>
        <button class="action-btn delete-btn" data-id="${prompt.id}">Delete</button>
      </div>
    `;
    document.getElementById('promptList').appendChild(li);
  
    // Add expand/collapse toggle
    const contentDiv = li.querySelector('.prompt-content');
    contentDiv.addEventListener('click', () => toggleExpand(contentDiv));
  
    // Add button event listeners
    li.querySelector('.copy-btn').addEventListener('click', () => copyPrompt(prompt));
    li.querySelector('.edit-btn').addEventListener('click', () => editPrompt(prompt));
    li.querySelector('.delete-btn').addEventListener('click', () => deletePrompt(prompt.id));
  }
  
  // Truncate content to 3 lines
  function truncateContent(content, lines) {
    const words = content.split(' ');
    let truncated = '';
    let lineCount = 0;
    for (let word of words) {
      if (lineCount >= lines * 10) break; // Approx 10 words per line
      truncated += word + ' ';
      if (word.length > 10) lineCount++;
      else lineCount += 0.5; // Approx word count per line
    }
    return truncated.trim() + (truncated.length < content.length ? '...' : '');
  }
  
  // Toggle expand/collapse of prompt content
  function toggleExpand(contentDiv) {
    contentDiv.classList.toggle('expanded');
    if (contentDiv.classList.contains('expanded')) {
      contentDiv.innerHTML = `
        <strong>${contentDiv.querySelector('strong').textContent}</strong><br>
        ${contentDiv.dataset.fullContent}<br>
        <em>${contentDiv.querySelector('em').textContent}</em>
      `;
    } else {
      const input = contentDiv.querySelector('strong').textContent;
      const tags = contentDiv.querySelector('em').textContent;
      contentDiv.innerHTML = `
        <strong>${input}</strong><br>
        ${truncateContent(contentDiv.dataset.fullContent, 3)}<br>
        <em>${tags}</em>
      `;
    }
  }
  
  // Copy prompt to clipboard
  function copyPrompt(prompt) {
    const text = `${prompt.input}\n${prompt.content}\nTags: ${prompt.tags.join(', ')}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Prompt copied to clipboard!');
    }).catch(err => console.error('Failed to copy:', err));
  }
  
  // Edit a prompt
  function editPrompt(prompt) {
    document.getElementById('input').value = prompt.input;
    document.getElementById('content').value = prompt.content;
    document.getElementById('tags').value = prompt.tags.join(', ');
  
    // Show the form and hide the list
    const listHeader = document.getElementById('listHeader');
    const promptsSection = document.getElementById('promptsSection');
    const formHeader = document.getElementById('formHeader');
    const promptForm = document.getElementById('promptForm');
  
    listHeader.style.display = 'none';
    promptsSection.style.display = 'none';
    formHeader.style.display = 'flex';
    promptForm.style.display = 'block';
  
    // Set editing state
    promptForm.dataset.editingId = prompt.id;
  }
  
  // Delete a prompt
  function deletePrompt(id) {
    if (confirm('Are you sure you want to delete this prompt?')) {
      chrome.storage.local.get(['prompts'], (result) => {
        const prompts = (result.prompts || []).filter(p => p.id !== id);
        chrome.storage.local.set({ prompts }, loadPrompts);
      });
    }
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
    enableDragAndDrop();
  }
  
  // Drag-and-drop for reordering and dragging to webpage
  function enableDragAndDrop() {
    const list = document.getElementById('promptList');
    let draggedItem = null;
  
    list.addEventListener('dragstart', (e) => {
      draggedItem = e.target.closest('li');
      if (draggedItem) {
        e.target.classList.add('dragging');
        const textContent = `${draggedItem.querySelector('strong').textContent}\n${draggedItem.querySelector('.prompt-content').dataset.fullContent}\n${draggedItem.querySelector('em').textContent}`;
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