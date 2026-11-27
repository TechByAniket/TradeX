import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { createHttpError } from "../utils/httpError.js";

export async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return next(createHttpError("Authentication token is required", 401));
    if (!process.env.JWT_SECRET) return next(createHttpError("JWT configuration is missing", 500));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(createHttpError("Invalid or expired token", 401));
    }

    if (!decoded?.userId) return next(createHttpError("Invalid authentication token", 401));

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, is_active: true, created_at: true },
    });

    if (!user) return next(createHttpError("Invalid authentication token", 401));
    if (!user.is_active) return next(createHttpError("Account is disabled", 403));

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
