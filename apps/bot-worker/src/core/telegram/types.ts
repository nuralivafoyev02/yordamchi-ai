export interface TelegramChat {
  id: number;
}

export interface TelegramMessage {
  chat: TelegramChat;
  from?: {
    first_name: string;
    id: number;
    language_code?: string;
    last_name?: string;
    username?: string;
  };
  message_id: number;
  text?: string;
}

export interface TelegramCallbackQuery {
  data?: string;
  from: {
    first_name: string;
    id: number;
    language_code?: string;
    last_name?: string;
    username?: string;
  };
  id: string;
  message?: TelegramMessage;
}

export interface TelegramUpdate {
  callback_query?: TelegramCallbackQuery;
  message?: TelegramMessage;
  update_id: number;
}

export interface TelegramInlineKeyboard {
  inline_keyboard: Array<Array<Record<string, string>>>;
}
