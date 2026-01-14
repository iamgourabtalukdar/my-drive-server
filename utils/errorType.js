export function errorType(errorCode) {
  switch (errorCode) {
    case 200:
      return "SUCCESS";
    case 201:
      return "CREATED";
    case 204:
      return "NO_CONTENT";
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 500:
      return "INTERNAL_SERVER_ERROR";
    case 503:
      return "SERVICE_UNAVAILABLE";
    case 507:
      return "INSUFFICIENT_STORAGE";
    default:
      return "APPLICATION_ERROR";
  }
}
