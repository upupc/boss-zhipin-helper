import type { MessageResponse } from './types';

// Function to check login status
export async function checkLoginStatus(): Promise<MessageResponse> {
  try {
    const response = await fetch('https://www.zhipin.com/wapi/zpblock/vip/state', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    const data = await response.json();
    return { isLoggedIn: data.code === 0, data };
  } catch (error) {
    console.error('检查登录状态时出错:', error);
    return { isLoggedIn: false, error: error instanceof Error ? error.message : String(error) };
  }
}