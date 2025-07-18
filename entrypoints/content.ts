declare global {
  var buttonList: HTMLButtonElement[];
  var geekDataList: { name: string; content: string; isJava: boolean; status?: string }[];
}

// Helper function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function foucsButton(button: HTMLButtonElement) {
  if (button) {
    const iframe = document.querySelector('iframe[name="recommendFrame"]') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      const buttonRect = button.getBoundingClientRect();
      const iframeWindow = iframe.contentWindow;
      const viewportHeight = iframeWindow.innerHeight;

      // 计算需要滚动的位置，使按钮位于视口中间
      const scrollTop = iframeWindow.scrollY + buttonRect.top - (viewportHeight / 2) + (buttonRect.height / 2);

      // 平滑滚动到目标位置
      iframeWindow.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });

      // 等待滚动完成后再聚焦
      await delay(300);
      button.focus();

      console.log(`已将按钮滚动到屏幕中间，按钮位置: ${buttonRect.top}px, 视口高度: ${viewportHeight}px`);
    }
  }
}


// Helper function to scroll iframe content to bottom
function scrollIframeToBottom(): boolean {
  const iframe = document.querySelector('iframe[name="recommendFrame"]') as HTMLIFrameElement;
  if (!iframe || !iframe.contentDocument || !iframe.contentWindow) {
    console.log('未找到推荐候选人iframe');
    return false;
  }
  
  // 控制浏览器垂直的滚动条推到最下方
  const iframeWindow = iframe.contentWindow;
  const iframeDoc = iframe.contentDocument;
  
  // 获取iframe内容的总高度
  const scrollHeight = iframeDoc.documentElement.scrollHeight || iframeDoc.body.scrollHeight;
  
  // 滚动到底部
  iframeWindow.scrollTo({
    top: scrollHeight,
    behavior: 'smooth'
  });
  
  console.log(`已将iframe滚动到底部，高度: ${scrollHeight}px`);
  return true;
}

// Helper function to get candidate cards from iframe
function getCandidateCards(): NodeListOf<Element> | null {
  const iframe = document.querySelector('iframe[name="recommendFrame"]') as HTMLIFrameElement;
  if (!iframe || !iframe.contentDocument) {
    console.log('未找到推荐候选人iframe');
    return null;
  }
  
  const iframeDoc = iframe.contentDocument;
  const candidateCards = iframeDoc.querySelectorAll('div.candidate-card-wrap');
  console.log(`找到 ${candidateCards.length} 个候选人卡片`);
  
  return candidateCards;
}

// Function to filter candidates and greet them
async function filterAndGreetCandidates(filterKeywords: string = 'Java') {
  // Wait a bit for iframe to load if needed
  await delay(1000);
  globalThis.geekDataList = [];
  globalThis.buttonList = [];
  
  let candidateCards: NodeListOf<Element> | null = null;
  let i = 0;
  do{
    // 滚动到底部以加载更多候选人
    const scrolResult = scrollIframeToBottom();
    if(!scrolResult){
      return [];
    }
    await delay(1500); // 等待新内容加载
    
    candidateCards = getCandidateCards();
    if (!candidateCards) {
      return [];
    }
    i++;
  }while(candidateCards && candidateCards.length<200&&i<=14);

  // Check if we have candidate cards after the loop
  if (!candidateCards) {
    return [];
  }
  
  // First pass: collect all candidate information
  const cardsArray = Array.from(candidateCards);
  
  for (let index = 0; index < cardsArray.length; index++) {
    const card = cardsArray[index];
    const nameEle = card.querySelector('span.name') as Element;
    const greetButton = card.querySelector('button.btn.btn-greet') as HTMLButtonElement;
    const name = nameEle?.textContent?.trim() || '未知';
    const cardText = card.textContent?.trim();
    const greetButtonText = greetButton?.textContent?.trim() || '未知';
    
    if(!cardText){
      continue;
    }

    if(greetButtonText!='打招呼'){
      continue;
    }
    
    // Parse keywords and check if card contains any of them
    const keywords = filterKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    const cardTextLower = cardText.toLowerCase();
    const containsKeyword = keywords.some(keyword => cardTextLower.includes(keyword));
    
    if(!containsKeyword){
      continue;
    }
    globalThis.buttonList.push(greetButton); 
    globalThis.geekDataList.push({
      name: name,
      content: cardText,
      isJava: containsKeyword,
      status: 'pending'
    });
  }
  return globalThis.geekDataList;
}

async function doGreeting(request: any) {
  // 生成1-5秒的随机延迟
  const randomDelay = Math.floor(Math.random() * 4000) + 1000; // 1000-5000ms
  console.log(`等待 ${randomDelay/1000} 秒后点击打招呼按钮...`);
  
  // 延迟执行，模拟人类操作
  await delay(randomDelay);
  
  const button = globalThis.buttonList[request.index];
  const geek = globalThis.geekDataList[request.index];
  
  // 检查按钮是否仍然可用
  
  // 将按钮滚动到屏幕中间
  await foucsButton(button);

  if (button && !button.disabled) {
    button.click();
    geek.status = 'greeted';
    console.log(`已向候选人 ${geek.name} 打招呼`);
  } else {
    geek.status = 'disabled';
    console.log(`候选人 ${geek.name} 的打招呼按钮已不可用`);
  }
  return geek;
}

export default defineContentScript({
  matches: ['*://*.zhipin.com/*'],
  main() {
    console.log('BOSS直聘助手 content script loaded');
    
    // Listen for messages from the sidepanel
    browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (request.action === 'filterGeeks') {
        // Handle async operation
        const keywords = request.filterKeywords || 'Java';
        filterAndGreetCandidates(keywords).then(geeks => {
          sendResponse({ geeks });
        }).catch(error => {
          console.error('筛选候选人时出错:', error);
          sendResponse({ geeks: [], error: error.message });
        });
      }else if (request.action === 'doGreeting') {
        doGreeting(request).then((geek) => {
          sendResponse({ success: true,geek:geek });
        }).catch(error => {
          console.error('打招呼时出错:', error);
          sendResponse({ success: false, error: error.message });
        });
      }
      return true;
    });
  },
});



