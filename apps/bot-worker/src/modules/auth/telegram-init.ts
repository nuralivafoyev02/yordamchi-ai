import { AppError } from '../../core/errors/app-error';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, value: string): Promise<ArrayBuffer> {
  const rawKey = key instanceof Uint8Array ? Uint8Array.from(key) : Uint8Array.from(new Uint8Array(key));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );

  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value));
}

export interface VerifiedTelegramInitData {
  authDate: number;
  raw: URLSearchParams;
  user: {
    first_name: string;
    id: number;
    language_code?: string;
    last_name?: string;
    username?: string;
  };
}

export async function verifyTelegramInitData(initData: string, botToken: string): Promise<VerifiedTelegramInitData> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const authDate = Number(params.get('auth_date'));
  const userRaw = params.get('user');

  if (!hash || !authDate || !userRaw) {
    throw new AppError('Invalid Telegram init data', 401, 'INVALID_INIT_DATA');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - authDate) > 60 * 60 * 24) {
    throw new AppError('Telegram init data expired', 401, 'INIT_DATA_EXPIRED');
  }

  const checkPairs = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = await hmacSha256(new TextEncoder().encode('WebAppData'), botToken);
  const digest = await hmacSha256(secretKey, checkPairs);

  if (toHex(digest) !== hash) {
    throw new AppError('Telegram init data signature mismatch', 401, 'INVALID_INIT_SIGNATURE');
  }

  return {
    authDate,
    raw: params,
    user: JSON.parse(userRaw) as VerifiedTelegramInitData['user'],
  };
}
