import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import prisma from "../config/prisma.js";

const INITIAL_CASH_BALANCE = 100000;
const BCRYPT_SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const googleClient = new OAuth2Client();

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function generateToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw createHttpError("JWT configuration is missing", 500);
  }

  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

function sanitizePortfolio(portfolio) {
  if (!portfolio) return null;

  const cashBalance =
    typeof portfolio.cash_balance?.toFixed === "function"
      ? portfolio.cash_balance.toFixed(2)
      : String(portfolio.cash_balance);

  return {
    id: portfolio.id,
    cash_balance: cashBalance,
    currency: portfolio.currency,
  };
}

function validateAndNormalizeEmail(email) {
  if (typeof email !== "string") {
    throw createHttpError("Valid email is required", 400);
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 255 || !EMAIL_REGEX.test(normalized)) {
    throw createHttpError("Valid email is required", 400);
  }

  return normalized;
}

function validateAndNormalizeName(name) {
  if (typeof name !== "string") {
    throw createHttpError("Name is required", 400);
  }

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) {
    throw createHttpError("Name must be between 1 and 100 characters", 400);
  }

  return trimmed;
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    throw createHttpError("Password must be between 8 and 72 characters", 400);
  }
}

export async function registerUser({ name, email, password }) {
  const cleanName = validateAndNormalizeName(name);
  const cleanEmail = validateAndNormalizeEmail(email);
  validatePassword(password);

  const existingUser = await prisma.users.findFirst({
    where: { email: { equals: cleanEmail, mode: "insensitive" } },
    select: { id: true },
  });

  if (existingUser) {
    throw createHttpError("Email is already registered", 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  try {
    const { user, portfolio } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.users.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          password_hash: passwordHash,
        },
      });

      const createdPortfolio = await tx.portfolios.create({
        data: {
          user_id: createdUser.id,
          cash_balance: INITIAL_CASH_BALANCE,
          currency: "INR",
        },
      });

      return { user: createdUser, portfolio: createdPortfolio };
    });

    const token = generateToken(user.id);

    return {
      token,
      user: sanitizeUser(user),
      portfolio: sanitizePortfolio(portfolio),
    };
  } catch (error) {
    if (error?.code === "P2002") {
      throw createHttpError("Email is already registered", 409);
    }
    throw error;
  }
}

export async function loginUser({ email, password }) {
  const cleanEmail = validateAndNormalizeEmail(email);

  if (typeof password !== "string" || password.length === 0) {
    throw createHttpError("Password is required", 400);
  }

  const user = await prisma.users.findFirst({
    where: { email: { equals: cleanEmail, mode: "insensitive" } },
    include: { portfolios: true },
  });

  if (!user || !user.password_hash) {
    throw createHttpError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw createHttpError("Invalid email or password", 401);
  }

  if (!user.is_active) {
    throw createHttpError("Account is disabled", 403);
  }

  const token = generateToken(user.id);

  return {
    token,
    user: sanitizeUser(user),
    portfolio: sanitizePortfolio(user.portfolios),
  };
}

export async function authenticateGooglePayload(payload) {
  if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
    throw createHttpError("Google account email is not verified", 401);
  }

  const googleId = String(payload.sub);
  const cleanEmail = validateAndNormalizeEmail(payload.email);
  const fallbackName = cleanEmail.split("@")[0];
  const cleanName = (payload.name?.trim() || fallbackName).slice(0, 100);

  const { user, portfolio, isNewUser } = await prisma.$transaction(async (tx) => {
    const existingByGoogle = await tx.users.findUnique({
      where: { google_id: googleId },
      include: { portfolios: true },
    });

    if (existingByGoogle) {
      if (!existingByGoogle.is_active) {
        throw createHttpError("Account is disabled", 403);
      }

      const userPortfolio =
        existingByGoogle.portfolios ||
        (await tx.portfolios.create({
          data: {
            user_id: existingByGoogle.id,
            cash_balance: INITIAL_CASH_BALANCE,
            currency: "INR",
          },
        }));

      return { user: existingByGoogle, portfolio: userPortfolio, isNewUser: false };
    }

    const existingByEmail = await tx.users.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
      include: { portfolios: true },
    });

    if (existingByEmail) {
      if (!existingByEmail.is_active) {
        throw createHttpError("Account is disabled", 403);
      }

      if (existingByEmail.google_id && existingByEmail.google_id !== googleId) {
        throw createHttpError("Email is already linked to a different Google account", 409);
      }

      const updatedUser = await tx.users.update({
        where: { id: existingByEmail.id },
        data: { google_id: googleId },
      });

      const userPortfolio =
        existingByEmail.portfolios ||
        (await tx.portfolios.create({
          data: {
            user_id: existingByEmail.id,
            cash_balance: INITIAL_CASH_BALANCE,
            currency: "INR",
          },
        }));

      return { user: updatedUser, portfolio: userPortfolio, isNewUser: false };
    }

    const createdUser = await tx.users.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        google_id: googleId,
        password_hash: null,
      },
    });

    const createdPortfolio = await tx.portfolios.create({
      data: {
        user_id: createdUser.id,
        cash_balance: INITIAL_CASH_BALANCE,
        currency: "INR",
      },
    });

    return { user: createdUser, portfolio: createdPortfolio, isNewUser: true };
  });

  const token = generateToken(user.id);

  return {
    token,
    user: sanitizeUser(user),
    portfolio: sanitizePortfolio(portfolio),
    isNewUser,
  };
}

export async function loginWithGoogle(idToken) {
  if (typeof idToken !== "string" || !idToken.trim()) {
    throw createHttpError("Google ID token is required", 400);
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!googleClientId) {
    throw createHttpError("Google SSO is not configured on the server", 503);
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken.trim(),
      audience: googleClientId,
    });
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
      id: true,
      name: true,
      email: true,
      is_active: true,
      created_at: true,
      portfolios: {
        select: {
          id: true,
          cash_balance: true,
          currency: true,
        },
      },
    },
  });

  if (!user) {
    throw createHttpError("User not found", 404);
  }

  if (!user.is_active) {
    throw createHttpError("Account is disabled", 403);
  }

  return {
    user: sanitizeUser(user),
    portfolio: sanitizePortfolio(user.portfolios),
  };
}
