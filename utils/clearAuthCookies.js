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
