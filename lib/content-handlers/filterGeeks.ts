import type { Geek } from './types';
import { randomDelay, scrollIframeToBottom, getCandidateCards } from './helpers';

// Function to filter candidates and greet them
export async function filterAndGreetCandidates(filterKeywords: string = 'Java'): Promise<Geek[]> {
  // Wait a bit for iframe to load if needed
  await randomDelay(1000,2000);
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
    await randomDelay(1500,2000); // 等待新内容加载
    
    candidateCards = getCandidateCards();
    if (!candidateCards) {
      return [];
    }
    i++;

    if(isNomoreElement()){
      break;
    }
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
    
    // Find all matched keywords
    const matchedKeywordsList = keywords.filter(keyword => cardTextLower.includes(keyword));
    
    if(matchedKeywordsList.length === 0){
      continue;
    }
    globalThis.buttonList.push(greetButton); 
    globalThis.geekDataList.push({
      name: name,
      content: cardText,
      matchedKeywords: matchedKeywordsList.join(','),
      status: 'pending'
    });
  }
  return globalThis.geekDataList;
}

function isNomoreElement(){
  const iframe = document.querySelector('iframe[name="recommendFrame"]') as HTMLIFrameElement;
  if (!iframe || !iframe.contentDocument) {
    console.log('未找到推荐候选人iframe');
    return null;
  }
  
  const iframeDoc = iframe.contentDocument;
  const nomore = iframeDoc.querySelector('span.nomore') as HTMLElement;
  return nomore&&nomore.textContent?.includes('没有更多了');
}