document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (data && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      e.target.value += data;
    }
  });