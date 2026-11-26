import {
  getUserProfile,
  loginUser,
  loginWithGoogle,
  registerUser,
} from "../services/authService.js";

export async function register(req, res, next) {
  try {
    const result = await registerUser(req.body || {});
    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await loginUser(req.body || {});
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function googleAuth(req, res, next) {
  try {
    const idToken = req.body?.idToken || req.body?.credential;
    const result = await loginWithGoogle(idToken);
    const statusCode = result.isNewUser ? 201 : 200;

    res.status(statusCode).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const result = await getUserProfile(req.user.id);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
