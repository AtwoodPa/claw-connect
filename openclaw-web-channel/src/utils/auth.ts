import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export function signToken(
  secret: string,
  options?: {
    sub?: string;
    expiresIn?: number;
    sessionId?: string;
  },
): string {
  const payload: JwtPayload = {
    sub: options?.sub ?? 'anonymous',
    sid: options?.sessionId ?? uuidv4(),
  };

  return jwt.sign(payload, secret, {
    expiresIn: options?.expiresIn ?? 3600,
  });
}

export function verifyToken(secret: string, token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
