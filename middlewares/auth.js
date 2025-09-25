import Session from "../models/sessionModel.js";

export async function checkAuth(req, res, next) {
  try {
    const { token } = req.signedCookies || {};

    if (!token) {
      res.clearCookie("token");
      return res.status(401).json({
        status: false,
        errors: {
          message: "Unauthorized: Session not found.",
          path: "/login",
        },
      });
    }

    const session = await Session.findById(token)
      .populate({
        path: "userId",
        select: "name rootFolderId",
      })
      .lean();

    // Check if the session or the populated user exists.
    // This also handles cases where a user was deleted but the session wasn't.
    if (!session || !session.userId) {
      res.clearCookie("token");
      return res.status(401).json({
        status: false,
        errors: {
          message: "Unauthorized: Invalid session.",
          path: "/login",
        },
      });
    }

    // Attach the populated user object to the request.
    req.user = session.userId;

    next();
  } catch (err) {
    res.clearCookie("token");
    next(err);
  }
}
