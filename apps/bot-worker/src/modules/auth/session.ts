import { jwtVerify, type JWTPayload, SignJWT } from 'jose';
import type { AppLocale, ThemeKey, UserRole } from '@yordamchi/shared';
import { AppError } from '../../core/errors/app-error';

const encoder = new TextEncoder();

export interface AppSessionClaims {
  app_user_id: string;
  locale: AppLocale;
  phone_registered: boolean;
  role: UserRole;
  telegram_user_id: number;
  theme: ThemeKey;
}

export async function signAppSession(secret: string, claims: AppSessionClaims) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 6;
  const payload: JWTPayload = { ...claims };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(encoder.encode(secret));

  return {
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    token,
  };
}

export async function verifyAppSession(secret: string, token: string): Promise<AppSessionClaims> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));

    return payload as unknown as AppSessionClaims;
  } catch {
    throw new AppError('Invalid or expired app session', 401, 'INVALID_SESSION');
  }
}
