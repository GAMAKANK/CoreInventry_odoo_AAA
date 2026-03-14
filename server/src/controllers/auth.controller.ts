import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { signToken } from '../utils/jwt';
import { ok, created, fail } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, role } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { fail(res, 'Email already registered'); return; }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: role || 'STAFF' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  created(res, { user, token });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    fail(res, 'Invalid credentials', 401); return;
  }
  if (!user.isActive) { fail(res, 'Account deactivated', 403); return; }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  ok(res, {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) { fail(res, 'User not found', 404); return; }
  ok(res, user);
}
