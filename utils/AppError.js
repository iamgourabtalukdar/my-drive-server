import { errorType } from "./errorType.js";

class AppError extends Error {
  constructor(message, statusCode, fields = null) {
    super(message);
    this.statusCode = statusCode;
    this.type = errorType(statusCode);

    if (fields) {
      this.fields = fields;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
