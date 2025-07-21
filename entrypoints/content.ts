import type { Geek } from '@/lib/content-handlers/types';
import { 
  checkLoginStatus, 
  filterAndGreetCandidates, 
  doGreeting,
  filterChatUsers,
  doDownloadResume 
} from '@/lib/content-handlers';

declare global {
  var buttonList: HTMLElement[];
  var geekDataList: Geek[];
}

export default defineContentScript({
  matches: ['*://*.zhipin.com/*'],
  main() {
    console.log('BOSS直聘助手 content script loaded');
    
    // Listen for messages from the sidepanel
    browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (request.action === 'checkLoginStatus') {
        checkLoginStatus().then(result => {
          sendResponse(result);
        }).catch(error => {
          sendResponse({ isLoggedIn: false, error: error instanceof Error ? error.message : String(error) });
        });
      } else if (request.action === 'filterGeeks') {
        // Handle async operation
        const keywords = request.filterKeywords || 'Java';
        filterAndGreetCandidates(keywords).then(geeks => {
          sendResponse({ geeks });
        }).catch(error => {
          console.error('筛选候选人时出错:', error);
          sendResponse({ geeks: [], error: error.message });
        });
      } else if (request.action === 'doGreeting') {
        doGreeting(request).then((geek) => {
          sendResponse({ success: true,geek:geek });
        }).catch(error => {
          console.error('打招呼时出错:', error);
          sendResponse({ success: false, error: error.message });
        });
      } else if (request.action === 'filterChatUsers') {
        const keywords = request.filterKeywords || 'Java';
        filterChatUsers(keywords).then(users => {
          sendResponse({ users });
        }).catch(error => {
          console.error('筛选聊天用户时出错:', error);
          sendResponse({ users: [], error: error instanceof Error ? error.message : String(error) });
        });
      } else if (request.action === 'doDownloadResume') {
        doDownloadResume(request).then(result => {
          sendResponse({ success: true, ...result });
        }).catch(error => {
          console.error('下载简历时出错:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
        });
      }
      return true;
    });
  },
});



