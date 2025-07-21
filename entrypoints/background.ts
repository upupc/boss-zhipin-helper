export default defineBackground(() => {
  console.log('Background script loaded!', { id: browser.runtime.id });

  // Handle extension icon click to open sidepanel
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await browser.sidePanel.open({ tabId: tab.id });
    }
  });

  // Set up sidepanel options on install
  browser.runtime.onInstalled.addListener(async () => {
    await browser.sidePanel.setOptions({
      path: 'sidepanel.html',
      enabled: true
    });
    
    await browser.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true
    });
  });
  
  // Handle directory scanning messages
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanDirectory') {
      // Since browser extensions cannot directly access the file system,
      // we'll simulate the directory scanning functionality
      // In a real implementation, this would require a native messaging host
      // or user file selection through file input
      
      // For now, return a simulated response
      sendResponse({
        success: false,
        error: '文件系统访问需要用户通过文件选择器手动选择文件。请考虑使用 <input type="file" webkitdirectory> 来让用户选择文件夹。'
      });
      
      // Alternative implementation ideas:
      // 1. Use chrome.fileSystem API (Chrome Apps only)
      // 2. Use File System Access API with user permission
      // 3. Implement a native messaging host
      // 4. Use webkitdirectory attribute on file input
    }
    
    return true; // Will respond asynchronously
  });
});
