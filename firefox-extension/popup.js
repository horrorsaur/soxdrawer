document.addEventListener('DOMContentLoaded', function() {
  const testButton = document.getElementById('testButton');
  
  testButton.addEventListener('click', function() {
    console.log('Hello from SoxDrawer extension!');
    
    // Test connection to the SoxDrawer server
    fetch('http://localhost:8080/')
      .then(response => {
        if (response.ok) {
          testButton.textContent = '✅ Server Connected!';
          testButton.style.background = 'rgba(0, 255, 0, 0.3)';
        } else {
          throw new Error('Server not responding');
        }
      })
      .catch(error => {
        console.error('Connection failed:', error);
        testButton.textContent = '❌ Server Offline';
        testButton.style.background = 'rgba(255, 0, 0, 0.3)';
      });
  });
  
  // Log that the extension loaded
  console.log('SoxDrawer extension popup loaded!');
});
