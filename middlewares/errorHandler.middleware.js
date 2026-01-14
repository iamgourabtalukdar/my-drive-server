export default function errorHandler(err, req, res, next) {
  console.error(err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const fields = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});

    return res.status(400).json({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        message: "Validation failed",
        fields,
      },
    });
  }

  // Mongo duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];

    return res.status(400).json({
      success: false,
      error: {
        type: "DUPLICATE_FIELD",
        message: `${field} already exists`,
        field,
      },
    });
  }

  // Custom AppError
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        type: err.type || "APPLICATION_ERROR",
        message: err.message,
        fields: err.fields || undefined,
      },
    });
  }

  // Fallback
  return res.status(500).json({
    success: false,
    error: {
      type: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
    },
  });
}
