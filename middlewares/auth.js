import User from "../models/userModel.js";

export function clearAuthCookie(req = null, res, cookieName) {
  const options = {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    // secure: process.env.NODE_ENV === "production",
    // sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  };

  // Add domain if request object is provided
  if (req && req.hostname) {
    options.domain = req.hostname;
  }

  res.clearCookie(cookieName, options);
}

export async function checkAuth(req, res, next) {
  const { token } = req.signedCookies || {};

  if (!token) {
    // Proper way to clear cookie
    clearAuthCookie(req, res, "token");
    return res.status(401).json({
      status: false,
      message: "Unauthorized: No token found or token modified",
    });
  }

  try {
    const { uid, expiry } = JSON.parse(
      Buffer.from(token, "base64url").toString()
    );

    // Convert expiry to Date object if it's a string
    const expiryDate = new Date(expiry);
    const currentDate = new Date();

    if (expiryDate <= currentDate) {
      // Proper way to clear cookie
      clearAuthCookie(req, res, "token");
      return res.status(401).json({
        status: false,
        message: "Unauthorized: Token expired",
      });
    }

    const foundUser = await User.findById(uid).select("-password").lean();
    if (!foundUser) {
      clearAuthCookie(req, res, "token");
      return res.status(400).json({
        status: false,
        message: "No user found",
      });
    }
    // Attach user  to request for downstream middleware
    req.user = foundUser;
    next();
  } catch (err) {
    // Proper way to clear cookie on parsing errors
    clearAuthCookie(req, res, "token");
    return res.status(401).json({
      status: false,
      message: "Unauthorized: Invalid token",
    });
  }
}
