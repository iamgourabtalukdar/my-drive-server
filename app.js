import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import connectToDB from "./config/db.js";
import { checkAuth } from "./middlewares/auth.js";

const PORT = 4000;
const HOST = "127.0.0.5";

const app = express();

//cors
app.use(
  cors({
    origin: "http://localhost:5175",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Parent-Folder-Id"],
    credentials: true,
  })
);
// app.use((req, res, next) => {
//   res.set({
//     "Access-Control-Allow-Origin": "http://localhost:5175",
//     "Access-Control-Allow-Headers": "Content-Type, parentfolderid",
//     "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE",
//     "Access-Control-Allow-Credentials": "true",
//   });
//   next();
// });

// Middlewares
app.use(express.json());
app.use(cookieParser("G0ur@b"));

// Routes
app.use("/user", userRoutes);
app.use("/folder", checkAuth, folderRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error(error); // Log the error for debugging

  // Handle validation errors
  if (error.name === "ValidationError") {
    const errors = Object.keys(error.errors).reduce((acc, key) => {
      acc[key] = error.errors[key].message;
      return acc;
    }, {});

    return res.status(400).json({
      status: false,
      message: "Validation failed",
      errors,
    });
  }

  // Handle duplicate email error
  if (error.code === 11000) {
    return res.status(400).json({
      status: false,
      errors: { message: "Email already exists" },
    });
  }

  // Handle custom errors with status codes
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      status: false,
      errors: { message: error.message },
    });
  }

  // Handle other unexpected errors
  res.status(500).json({
    status: false,
    errors: { message: "Internal server error" },
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectToDB();
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
