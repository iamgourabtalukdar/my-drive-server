import { errorType } from "./errorType.js";

class AppError extends Error {
  constructor(message, statusCode, type = null, extraFields = null) {
    super(message);
    this.statusCode = statusCode;
    if (type) {
      this.type = type;
    } else {
      this.type = errorType(statusCode);
    }

    if (extraFields) {
      this.fields = extraFields;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
