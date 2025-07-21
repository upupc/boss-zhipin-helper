import type { Geek, MessageRequest } from './types';
import { randomDelay, focusButton } from './helpers';

export async function doGreeting(request: MessageRequest): Promise<Geek> {
  // 延迟执行，模拟人类操作
  await randomDelay(1000,5000);
  
  const element = globalThis.buttonList[request.index!] as HTMLButtonElement;
  const geek = globalThis.geekDataList[request.index!];
  
  // 将元素滚动到屏幕中间
  await focusButton(element);

  console.log('element:' + element);
  console.log('element:' + element.disabled);
  console.log('element:' + (element instanceof HTMLButtonElement));
  // Check if element is a button and not disabled
  if (element && !element.disabled) {
    element.click();
    geek.status = 'greeted';
    console.log(`已向候选人 ${geek.name} 打招呼`);
  } else if (element && element.disabled) {
    geek.status = 'disabled';
    console.log(`候选人 ${geek.name} 的打招呼按钮已不可用`);
  } else {
    geek.status = 'failed';
    console.log(`候选人 ${geek.name} 的元素不是按钮`);
  }
  return geek;
}