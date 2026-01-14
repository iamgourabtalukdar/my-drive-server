export function setCookie(res, name, value, options = {}) {
  const defaultOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    signed: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  res.cookie(name, value, {
    ...defaultOptions,
    ...options,
  });
}

export function removeCookie(res, name, options = {}) {
  const defaultOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    signed: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  res.clearCookie(name, {
    ...defaultOptions,
    ...options,
  });
}
