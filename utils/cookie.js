const isProduction = process.env.NODE_ENV === "production";

export function setCookie(res, name, value, options = {}) {
  const defaultOptions = {
    httpOnly: true,
    signed: true,
    path: "/",

    // STRATEGY:
    // In Prod: We share the root domain '.gourab.tech', so 'Lax' works perfectly.
    // In Dev: 'Lax' works on localhost because browsers treat ports as "SameSite".
    sameSite: "lax",

    secure: isProduction,

    // CRITICAL PART:
    // Prod: Allow cookie sharing between 'storage-app' and 'storage-app-backend'
    // Dev: Leave undefined (localhost handles it automatically)
    domain: isProduction ? ".gourab.tech" : undefined,
  };

  res.cookie(name, value, {
    ...defaultOptions,
    ...options,
  });
}

export function removeCookie(res, name, options = {}) {
  // To delete a cookie, the path and domain MUST match exactly how it was set
  const defaultOptions = {
    httpOnly: true,
    signed: true,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
    domain: isProduction ? ".gourab.tech" : undefined,
  };

  res.clearCookie(name, {
    ...defaultOptions,
    ...options,
  });
}
