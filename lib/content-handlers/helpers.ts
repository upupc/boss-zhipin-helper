// Helper function to delay execution
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  console.log(`延迟${delay}毫秒`);
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper function to focus element and scroll it to center
export async function focusButton(element: HTMLElement) {
  if (element) {
    const iframe = document.querySelector('iframe[name="recommendFrame"]') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      const elementRect = element.getBoundingClientRect();
      const iframeWindow = iframe.contentWindow;
      const viewportHeight = iframeWindow.innerHeight;

      // 计算需要滚动的位置，使元素位于视口中间
      const scrollTop = iframeWindow.scrollY + elementRect.top - (viewportHeight / 2) + (elementRect.height / 2);

      // 平滑滚动到目标位置
      iframeWindow.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });

      // 等待滚动完成后再聚焦
      await randomDelay(300,1000);
      element.focus();

      console.log(`已将元素滚动到屏幕中间，元素位置: ${elementRect.top}px, 视口高度: ${viewportHeight}px`);
    }
  }
}

// Helper function to scroll iframe content to bottom
export function scrollIframeToBottom(): boolean {
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
export function getCandidateCards(): NodeListOf<Element> | null {
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