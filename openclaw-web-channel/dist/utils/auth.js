import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
export function signToken(secret, options) {
    const payload = {
        sub: options?.sub ?? 'anonymous',
        sid: options?.sessionId ?? uuidv4(),
    };
    return jwt.sign(payload, secret, {
        expiresIn: options?.expiresIn ?? 3600,
    });
}
export function verifyToken(secret, token) {
    return jwt.verify(token, secret);
}
//# sourceMappingURL=auth.js.map