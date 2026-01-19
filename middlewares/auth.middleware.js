import AppError from "../utils/AppError.js";
import Session from "../models/Session.model.js";

export async function authMiddleware(req, res, next) {
  const sessionId = req.signedCookies.sid;

  if (!sessionId) {
    return next(new AppError("Session ID is required", 401));
  }

  const session = await Session.findOne({
    sessionId,
  }).populate("userId");

  if (!session) {
    return next(new AppError("Session expired", 401));
  }

  const user = session.userId;

  if (!user.isEmailVerified) {
    return next(new AppError("Email not verified.", 403, "NOT_VERIFIED"));
  }

  session.lastActiveAt = new Date();
  await session.save();

  req.user = user;
  req.session = session;

  next();
}
