import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import connectToDB from "./config/db.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import fileRouters from "./routes/file.routes.js";
import folderRoutes from "./routes/folder.routes.js";
import starredRoutes from "./routes/starred.routes.js";
import trashRoutes from "./routes/trash.routes.js";

const app = express();

// REQUIRED when using Nginx / reverse proxy
app.set("trust proxy", true);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

// Middlewares
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// ### Routes
// Health Check Route
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Storage App Backend is Running 🚀",
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/folders", authMiddleware, folderRoutes);
app.use("/api/files", authMiddleware, fileRouters);
app.use("/api/trash", authMiddleware, trashRoutes);
app.use("/api/starred", authMiddleware, starredRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: "NOT_FOUND",
      message: "Route not found",
    },
  });
});
// Global Error Handler
app.use(errorHandler);

// Server Start
async function startServer() {
  try {
    await connectToDB();

    const PORT = process.env.PORT || 4000;
    const HOST = process.env.HOST || "localhost";

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server is running at http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
