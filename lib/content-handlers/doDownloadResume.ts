import type { MessageRequest } from './types';
import { randomDelay } from './helpers';

export async function doDownloadResume(request: MessageRequest): Promise<any> {
  const index = request.index;
  
  if (index === undefined) {
    throw new Error('Index is required for doDownloadResume');
  }
  
  console.log(`正在查找第 ${index + 1} 个聊天用户项...`);

  if (index >= globalThis.geekDataList.length) {
    throw new Error(`索引 ${index} 超出范围，只有 ${globalThis.geekDataList.length} 个用户`);
  }
  
  // Find all chat user items
  const userItem = globalThis.geekDataList[index];
  const button = globalThis.buttonList[index];
  console.log('button:' + button);
  if (!userItem) {
    throw new Error('未找到聊天用户');
  }
  
  // Scroll the item into view
  button.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await randomDelay(500,1000);
  
  // Click the item to trigger resume download
  button.click();
  console.log(`已点击第 ${index + 1} 个用户项，打开对话框`);


  //等待页面加载
  await randomDelay(1000,2000);
  
  await clickRequestResumeButton();

  await randomDelay(1000,3000);
  openResumeAttachment();

  await randomDelay(1000,3000);
  clickDownloadResume();

  await randomDelay(1000,3000);
  closeResumeAttachment();

  await randomDelay(1000,3000);
  return {
    success: true,
    index: index
  };
}

async function clickRequestResumeButton(){
  const messageItems = document.querySelectorAll('div.message-item')
  /**
   * 遍历messageItems，查找是否存在"对方想发送加密附件简历给您，您是否同意"的item, item的html代码如下：
   * <div data-v-422bad6e="" class="message-item"><!----> <div><div class="item-friend" geek-info="[object Object]"><div class="text reset-message-text"><!----> <div class="message-card-wrap boss-green"><div class="message-card-top-wrap"><div class="message-card-top-icon-content"><span class="message-dialog-icon message-dialog-icon-resume"></span></div> <div class="message-card-top-content"><div class="message-card-top-title-wrap"><h3 class="message-card-top-title message-card-top-text">对方想发送加密附件简历给您，您是否同意</h3></div> <!----> <!----></div></div> <!---->  <div class="message-card-buttons"><span class="card-btn disabled">拒绝</span><span d-c="61031" class="card-btn disabled">同意</span></div></div></div> <div data-v-3f4a7731="" class="figure"><div data-v-3f4a7731="" class="avatar-content"><img data-v-3f4a7731="" src="https://img.bosszhipin.com/beijin/upload/avatar/20250513/607f1f3d68754fd0fe00ee894c4363c4c4a0c97bd8eb93a5e72437089162a6e762624fd17b570ab5_s.png.webp"></div></div></div></div> <!----></div>
   * 
   * 如果不存在，则继续执行后续的逻辑
   */
  
  // Check if there's an encrypted resume request
  for (let i = 0; i < messageItems.length; i++) {
    const item = messageItems[i];
    const titleElement = item.querySelector('.message-card-top-title');
    
    if (titleElement && (titleElement.textContent?.includes('对方想发送加密附件简历给您，您是否同意')
    ||titleElement.textContent?.includes('对方想发送附件简历给您，您是否同意'))) {
      console.log('找到加密简历请求');
      
      // Find and click the "同意" (Accept) button
      const acceptButton = item.querySelector('.message-card-buttons .card-btn:last-child') as HTMLElement;
      if (acceptButton && !acceptButton.classList.contains('disabled')) {
        acceptButton.click();
        console.log('已点击同意按钮');
        return;
      } else if (acceptButton && acceptButton.classList.contains('disabled')) {
        console.log('同意按钮已被禁用，可能已经处理过');
        return;
      }else{
        return;
      }
    }
  }
  
  console.log('没有找到加密简历请求，继续执行后续逻辑');
  

  const buttonList = document.querySelectorAll('span.operate-btn');
  for(let i=0;i<buttonList.length;i++){
    const btn = buttonList[i] as HTMLElement;
    const text = btn?.textContent?.trim() || '';
    if(text.includes('求简历')){
      btn.click();

      await randomDelay(500,1000);

      const doubleConfirmDiv = document.querySelector('div.exchange-tooltip');
      if(!doubleConfirmDiv){
        console.log('未找到确认框!');
        return;
      }
      
      if(doubleConfirmDiv.textContent?.includes('确定向牛人请求简历')||doubleConfirmDiv.textContent?.includes('确定向牛人索取简历')){
        const confirmBtn = doubleConfirmDiv.querySelector('span.boss-btn-primary.boss-btn') as HTMLElement;
        if(confirmBtn?.textContent?.includes('确定')){
          confirmBtn.click();
          await randomDelay(500,1000);
        }
      }
      return;
    }
  }
}

function openResumeAttachment(){
  const messageItems = document.querySelectorAll('div.message-item')
  for (let i = 0; i < messageItems.length; i++) {
    const item = messageItems[i];
    const elements = item.querySelectorAll('span.card-btn');
    const button = getResumeAttachmentButton(elements) as HTMLElement;
    if(button){
      button.click();
      return;
    }
  }
}

function closeResumeAttachment(){
  const closeBtn = document.querySelector('div.boss-popup__close') as HTMLElement;
  if(closeBtn){
    closeBtn.click();
  }
}

function getResumeAttachmentButton(buttonList: NodeListOf<Element>){
  for(let i=0;i<buttonList.length;i++){
    const button = buttonList[i];
    if(button&&button.textContent?.includes('点击预览附件简历')){
      return button;
    }
  }
  return null;
}

function clickDownloadResume(){
  const attachmentResumeBtns = document.querySelector('div.attachment-resume-btns')
  const elementList = attachmentResumeBtns?.querySelectorAll('div.popover.icon-content.popover-bottom');
  if(!elementList){
    return;
  }
  if(elementList.length<=2){
    return;
  }
  const element = elementList[2] as HTMLElement;
  const span = element.querySelector('span') as HTMLElement;
  span.click();
}