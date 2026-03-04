import type { JwtPayload } from 'jsonwebtoken';
export declare function signToken(secret: string, options?: {
    sub?: string;
    expiresIn?: number;
    sessionId?: string;
}): string;
export declare function verifyToken(secret: string, token: string): JwtPayload;
