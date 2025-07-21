import type { Geek } from './types';
import { randomDelay } from './helpers';

// Function to filter chat users with new messages
export async function filterChatUsers(filterKeywords: string = 'Java'): Promise<Geek[]> {
  // Wait a bit for page to load if needed
  await randomDelay(1000,3000);
  
  globalThis.geekDataList = [];
  globalThis.buttonList = [];

  try {

    switchUnreadFilter();

    await randomDelay(1000,2000);

    // Find all chat user items in the user list
    const userItems = document.querySelectorAll('div.geek-item');
    console.log(`找到 ${userItems.length} 个聊天用户项`);
    
    // Parse keywords for filtering
    const keywords = filterKeywords ? filterKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [];
    
    // Process each user item
    userItems.forEach((item, index) => {
      // Check if user has new messages (badge-count > 0)
      const badgeElement = item.querySelector('.badge-count span');
      const messageCount = badgeElement ? parseInt(badgeElement.textContent?.trim() || '0', 10) : 0;
      
      // Only process users with new messages
      if (messageCount > 0) {
        // Extract user information
        const nameElement = item.querySelector('.geek-name');
        const jobElement = item.querySelector('.source-job');
        const messageElement = item.querySelector('.push-text');
        const timeElement = item.querySelector('.time');
        
        const name = nameElement?.getAttribute('title') || nameElement?.textContent?.trim() || `用户${index + 1}`;
        const job = jobElement?.getAttribute('title') || jobElement?.textContent?.trim() || '';
        const message = messageElement?.textContent?.trim() || '';
        const time = timeElement?.textContent?.trim() || '';
        
        // Combine all text for keyword matching
        const fullText = `${name} ${job} ${message}`.toLowerCase();
        
        // Find all matched keywords
        const matchedKeywordsList = keywords.filter(keyword => fullText.includes(keyword));
        
        // Only add user if matches keywords (or no keywords specified)
        if (keywords.length === 0 || matchedKeywordsList.length > 0) {
          globalThis.buttonList.push(item as HTMLElement);
          globalThis.geekDataList.push({
            name: name,
            content: `${job}${message ? ' - ' + message : ''}${time ? ' (' + time + ')' : ''}`,
            matchedKeywords: matchedKeywordsList.join(','),
            status: `${messageCount}条新消息`,
            messageCount: messageCount
          });
        }
      }
    });
    
    console.log(`筛选出 ${globalThis.geekDataList.length} 个有新消息的聊天用户`);
    return globalThis.geekDataList;
    
  } catch (error) {
    console.error('筛选聊天用户时出错:', error);
    return [];
  }
}

function switchUnreadFilter(){
  const filters = document.querySelector('div.chat-message-filter-left') as HTMLElement;
  const filterList = filters.querySelectorAll('span');
  for(let i=0;i<filterList.length;i++){
    const filter = filterList[i] as HTMLElement;
    if(filter&&filter.textContent?.includes('未读')){
      filter.click();
      return;
    }
  }
}