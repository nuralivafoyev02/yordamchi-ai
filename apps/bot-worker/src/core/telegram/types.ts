export interface TelegramChat {
  id: number;
}

export interface TelegramMessage {
  audio?: Record<string, unknown>;
  chat: TelegramChat;
  contact?: {
    first_name?: string;
    last_name?: string;
    phone_number: string;
    user_id?: number;
    vcard?: string;
  };
  from?: {
    first_name: string;
    id: number;
    language_code?: string;
    last_name?: string;
    username?: string;
  };
  message_id: number;
  text?: string;
  video_note?: Record<string, unknown>;
  voice?: Record<string, unknown>;
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

export interface TelegramWebAppButton {
  text: string;
  web_app: {
    url: string;
  };
}

export interface TelegramUrlButton {
  text: string;
  url: string;
}

export interface TelegramCallbackButton {
  callback_data: string;
  text: string;
}

export interface TelegramInlineKeyboard {
  inline_keyboard: Array<Array<TelegramWebAppButton | TelegramUrlButton | TelegramCallbackButton>>;
}

export interface TelegramReplyKeyboardButton {
  request_contact?: boolean;
  text: string;
  web_app?: {
    url: string;
  };
}

export interface TelegramReplyKeyboard {
  keyboard: Array<Array<TelegramReplyKeyboardButton>>;
  is_persistent?: boolean;
  one_time_keyboard?: boolean;
  resize_keyboard?: boolean;
}

export interface TelegramRemoveKeyboard {
  remove_keyboard: true;
}
