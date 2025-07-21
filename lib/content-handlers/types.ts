export interface Geek {
  name: string;
  content: string;
  matchedKeywords?: string;  // 匹配的关键字，用逗号分隔
  status?: string;
  messageCount?: number;
}

export interface MessageRequest {
  action: string;
  index?: number;
  filterKeywords?: string;
}

export interface MessageResponse {
  success?: boolean;
  isLoggedIn?: boolean;
  geeks?: Geek[];
  geek?: Geek;
  error?: string;
  data?: any;
}