export default defineContentScript({
  matches: ['*://*.zhipin.com/*'],
  main() {
    console.log('BOSS直聘助手 content script loaded');
    
    // Listen for messages from the sidepanel
    browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (request.action === 'filterGeeks') {
        // Handle async operation
        filterGeekCards().then(geeks => {
          sendResponse({ geeks });
        }).catch(error => {
          console.error('筛选候选人时出错:', error);
          sendResponse({ geeks: [], error: error.message });
        });
        
        // Return true to indicate we'll send a response asynchronously
        return true;
      }
    });
    
    // Helper function to generate random delay
    function getRandomDelay(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Helper function to delay execution
    function delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Function to filter and extract geek card information
    async function filterGeekCards() {
      const iframe = document.querySelector('iframe[name="recommendFrame"]') as HTMLIFrameElement;
      if (!iframe || !iframe.contentDocument) {
        console.log('未找到推荐候选人iframe');
        return [];
      }
      
      const iframeDoc = iframe.contentDocument;
      const candidateCards = iframeDoc.querySelectorAll('div.candidate-card-wrap');
      const geekData: { name: string; content: string; isJava: boolean; hasButton: boolean; buttonIndex: number }[] = [];
      
      console.log(`找到 ${candidateCards.length} 个候选人卡片`);
      
      // Convert NodeList to Array for async processing
      const cardsArray = Array.from(candidateCards);
      
      for (let index = 0; index < cardsArray.length; index++) {
        const card = cardsArray[index];
        const nameEle = card.querySelector('span.name') as Element;
        const greetButton = card.querySelector('button.btn.btn-greet') as HTMLButtonElement;
        const name = nameEle?.textContent?.trim() || '未知';
        const cardText = card.textContent?.trim();
        
        if(!cardText){
          continue;
        }
        
        const isJava = cardText.toLowerCase().includes('java');
        
        // 如果是Java候选人且有打招呼按钮，则自动点击
        if (isJava && greetButton && !greetButton.disabled) {
          // 生成3-8秒的随机延迟，模拟人类操作
          const delayTime = getRandomDelay(3000, 8000);
          console.log(`等待 ${delayTime/1000} 秒后向Java候选人 ${name} 打招呼`);
          
          await delay(delayTime);
          
          // 再次检查按钮是否仍然可用
          if (!greetButton.disabled) {
            greetButton.click();
            console.log(`已向Java候选人 ${name} 打招呼`);
            
            // 点击后再等待1-2秒，模拟操作后的停顿
            await delay(getRandomDelay(1000, 2000));
          }
        }

        geekData.push({
          name: name,
          content: cardText,
          isJava: isJava,
          hasButton: !!greetButton,
          buttonIndex: index
        });
      }
      
      return geekData;
    }
  },
});