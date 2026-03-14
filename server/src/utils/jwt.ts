import jwt from 'jsonwebtoken';

const JWT_SECRET  = process.env.JWT_SECRET  || 'coreinventory-dev-secret-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

export interface JWTPayload {
  userId: string;
  email:  string;
  role:   string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}
