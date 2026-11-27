import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import prisma from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";

const INITIAL_CASH_BALANCE = 100000;
const BCRYPT_SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const googleClient = new OAuth2Client();

function generateToken(userId) {
  if (!process.env.JWT_SECRET) throw createHttpError("JWT configuration is missing", 500);
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
}

function sanitizeUser(user) {
  return { id: user.id, name: user.name, email: user.email, is_active: user.is_active, created_at: user.created_at };
}

function sanitizePortfolio(portfolio) {
  if (!portfolio) return null;
  const cash_balance = typeof portfolio.cash_balance?.toFixed === "function"
    ? portfolio.cash_balance.toFixed(2)
    : String(portfolio.cash_balance);
  return { id: portfolio.id, cash_balance, currency: portfolio.currency };
}

function normalizeEmail(email) {
  const clean = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!clean || clean.length > 255 || !EMAIL_REGEX.test(clean)) {
    throw createHttpError("Valid email is required", 400);
  }
  return clean;
}

function normalizeName(name) {
  const clean = typeof name === "string" ? name.trim() : "";
  if (!clean || clean.length > 100) {
    throw createHttpError("Name must be between 1 and 100 characters", 400);
  }
  return clean;
}

async function ensurePortfolio(tx, userId, existingPortfolio) {
  return existingPortfolio || tx.portfolios.create({
    data: { user_id: userId, cash_balance: INITIAL_CASH_BALANCE, currency: "INR" },
  });
}

export async function registerUser({ name, email, password }) {
  const cleanName = normalizeName(name);
  const cleanEmail = normalizeEmail(email);
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    throw createHttpError("Password must be between 8 and 72 characters", 400);
  }

  const existing = await prisma.users.findFirst({
    where: { email: { equals: cleanEmail, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw createHttpError("Email is already registered", 409);

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  try {
    const { user, portfolio } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.users.create({
        data: { name: cleanName, email: cleanEmail, password_hash: passwordHash },
      });
      const createdPortfolio = await ensurePortfolio(tx, createdUser.id, null);
      return { user: createdUser, portfolio: createdPortfolio };
    });

    return { token: generateToken(user.id), user: sanitizeUser(user), portfolio: sanitizePortfolio(portfolio) };
  } catch (error) {
    if (error?.code === "P2002") throw createHttpError("Email is already registered", 409);
    throw error;
  }
}

export async function loginUser({ email, password }) {
  const cleanEmail = normalizeEmail(email);
  if (typeof password !== "string" || password.length === 0) {
    throw createHttpError("Password is required", 400);
  }

  const user = await prisma.users.findFirst({
    where: { email: { equals: cleanEmail, mode: "insensitive" } },
    include: { portfolios: true },
  });

  if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    throw createHttpError("Invalid email or password", 401);
  }
  if (!user.is_active) throw createHttpError("Account is disabled", 403);

  return { token: generateToken(user.id), user: sanitizeUser(user), portfolio: sanitizePortfolio(user.portfolios) };
}

export async function authenticateGooglePayload(payload) {
  if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
    throw createHttpError("Google account email is not verified", 401);
  }

  const googleId = String(payload.sub);
  const cleanEmail = normalizeEmail(payload.email);
  const cleanName = (payload.name?.trim() || cleanEmail.split("@")[0]).slice(0, 100);

  const { user, portfolio, isNewUser } = await prisma.$transaction(async (tx) => {
    const byGoogle = await tx.users.findUnique({ where: { google_id: googleId }, include: { portfolios: true } });
    if (byGoogle) {
      if (!byGoogle.is_active) throw createHttpError("Account is disabled", 403);
      return { user: byGoogle, portfolio: await ensurePortfolio(tx, byGoogle.id, byGoogle.portfolios), isNewUser: false };
    }

    const byEmail = await tx.users.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      include: { portfolios: true },
    });
    if (byEmail) {
      if (!byEmail.is_active) throw createHttpError("Account is disabled", 403);
      if (byEmail.google_id && byEmail.google_id !== googleId) {
        throw createHttpError("Email is already linked to a different Google account", 409);
      }
      const linkedUser = await tx.users.update({ where: { id: byEmail.id }, data: { google_id: googleId } });
      return { user: linkedUser, portfolio: await ensurePortfolio(tx, byEmail.id, byEmail.portfolios), isNewUser: false };
    }

    const createdUser = await tx.users.create({
      data: { name: cleanName, email: cleanEmail, google_id: googleId, password_hash: null },
    });
    return { user: createdUser, portfolio: await ensurePortfolio(tx, createdUser.id, null), isNewUser: true };
  });

  return { token: generateToken(user.id), user: sanitizeUser(user), portfolio: sanitizePortfolio(portfolio), isNewUser };
}

export async function loginWithGoogle(idToken) {
  if (typeof idToken !== "string" || !idToken.trim()) {
    throw createHttpError("Google ID token is required", 400);
  }
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!googleClientId) throw createHttpError("Google SSO is not configured on the server", 503);

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: idToken.trim(), audience: googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw createHttpError("Invalid or expired Google token", 401);
  }
  return authenticateGooglePayload(payload);
}

export async function getUserProfile(userId) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, is_active: true, created_at: true,
      portfolios: { select: { id: true, cash_balance: true, currency: true } },
    },
  });

  if (!user) throw createHttpError("User not found", 404);
  if (!user.is_active) throw createHttpError("Account is disabled", 403);

  return { user: sanitizeUser(user), portfolio: sanitizePortfolio(user.portfolios) };
}
