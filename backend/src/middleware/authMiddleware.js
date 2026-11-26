import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

export async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = new Error("Authentication token is required");
      error.statusCode = 401;
      return next(error);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      const error = new Error("Authentication token is required");
      error.statusCode = 401;
      return next(error);
    }

    if (!process.env.JWT_SECRET) {
      const error = new Error("JWT configuration is missing");
      error.statusCode = 500;
      return next(error);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      const error = new Error("Invalid or expired token");
      error.statusCode = 401;
      return next(error);
    }

    if (!decoded?.userId) {
      const error = new Error("Invalid authentication token");
      error.statusCode = 401;
      return next(error);
    }

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
      },
    });

    if (!user) {
      const error = new Error("Invalid authentication token");
      error.statusCode = 401;
      return next(error);
    }

    if (!user.is_active) {
      const error = new Error("Account is disabled");
      error.statusCode = 403;
      return next(error);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
