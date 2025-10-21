import mongoose from "mongoose";
import path from "path";
import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";
import {
  changeStarOfFileSchema,
  moveFileToTrashSchema,
  renameFileSchema,
  serveFileSchema,
} from "../validators/fileSchema.js";
import { z } from "zod/v4";
import { updateFolderSize } from "../utils/utils.js";

// ### SERVING FILE
export async function serveFile(req, res, next) {
  try {
    const { success, data, error } = serveFileSchema.safeParse({
      params: req.params,
    });

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }

    const { fileId } = data.params;

    const foundFile = await File.findOne({ _id: fileId, userId: req.user._id })
      .select("name size extension userId mimetype")
      .lean();

    if (!foundFile) {
      return res.status(400).json({
        status: false,
        errors: { message: "File Not Found Or You don't have the permission" },
      });
    }
    const fullFilePath = path.resolve(
      req.STORAGE_BASE_DIR,
      foundFile._id + foundFile.extension
    );
    // checking path vulnerability
    if (!fullFilePath.startsWith(req.STORAGE_BASE_DIR)) {
      return res.status(403).json({ error: "Access Denied!" });
    }

    res.set("Content-Type", foundFile.mimetype);

    // if it is a download request
    if (req.query.action === "download") {
      res.set(
        "Content-Disposition",
        `Attachment; filename=${foundFile.name}${foundFile.extension}`
      );
    } else {
      res.set(
        "Content-Disposition",
        `inline; filename=${foundFile.name}${foundFile.extension}`
      );
    }
    // send the file
    res.sendFile(fullFilePath, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ error: "File not found!" });
      }
    });
  } catch (error) {
    next(error);
  }
}

// ### UPLOADING FILES
export async function uploadFiles(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const uploadedFiles = req.files;

    if (!uploadedFiles) {
      return res.status(400).json({
        status: false,
        errors: { message: "No File found to upload" },
      });
    }

    // Get the ID from the request body, parsed by Multer
    const parentFolderId = req.body.parentFolderId || req.user.rootFolderId;

    // checking parent  folder id
    if (!mongoose.isValidObjectId(parentFolderId)) {
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid parent folder id" },
      });
    }

    const parentFolderExists = await Folder.findById(parentFolderId)
      .select({ userId: 1 })
      .lean();

    if (!parentFolderExists) {
      return res.status(404).json({
        error: "Error while Uploading file : Parent Folder Not Found",
      });
    }

    // checking the permissions
    if (!parentFolderExists.userId.equals(req.user._id)) {
      return res.status(401).json({ error: "You don't have permission" });
    }

    const fileDocs = uploadedFiles.map((file, i) => ({
      _id: req.generatedFileIds[i],
      name: file.originalname.replace(/\.[^.\s]+$/, ""),
      extension: path.extname(file.originalname),
      mimetype: file.mimetype,
      size: file.size,
      parentFolderId,
      userId: req.user._id,
    }));

    await File.insertMany(fileDocs, { ordered: false, session });

    await updateFolderSize(
      parentFolderId,
      fileDocs.reduce((acc, file) => acc + file.size, 0),
      session
    );
    await session.commitTransaction();
    return res.status(201).json({
      status: true,
      message: "Files uploaded successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
}

// ### RENAMING FILE
export async function renameFile(req, res, next) {
  try {
    const { success, data, error } = renameFileSchema.safeParse({
      body: req.body,
      params: req.params,
    });

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }
    const { name } = data.body;
    const { fileId } = data.params;

    // checking validity of folder id
    if (!mongoose.isValidObjectId(fileId)) {
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid Folder ID" },
      });
    }

    // checking user permission
    const foundFileId = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    })
      .select("_id")
      .lean();

    if (!foundFileId) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: {
          message: "You don't have access to this File or it does not exist.",
        },
      });
    }

    await File.findByIdAndUpdate(foundFileId, { name });
    return res.status(200).json({ status: true, message: "File renamed" });
  } catch (error) {
    next(error);
  }
}

// ### MOVE FILE TO TRASH
export async function moveFileToTrash(req, res, next) {
  try {
    const { success, data, error } = moveFileToTrashSchema.safeParse({
      params: req.params,
    });

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }
    const { fileId } = data.params;

    // checking user permission
    const foundFile = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    })
      .select("_id isTrashed")
      .lean();

    if (!foundFile) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: {
          message: "You don't have access to this File or it does not exists",
        },
      });
    }

    await File.findByIdAndUpdate(foundFile._id, { isTrashed: true });
    return res
      .status(200)
      .json({ status: true, message: "File is moved to trash" });
  } catch (error) {
    next(error);
  }
}

// ### SERVING RECENT FILES
export async function recentFile(req, res, next) {
  try {
    const foundFiles = await File.find({
      userId: req.user._id,
      isTrashed: false,
    })
      .select("name size extension userId starred updatedAt")
      .lean();

    const formattedFiles = {};
    foundFiles.forEach(
      ({ _id, name, size, extension, userId, updatedAt, starred }) => {
        // const owner = String(userId) === String(req.user._id) ? "me" : "other";
        const obj = {
          id: _id,
          name,
          extension,
          size,
          owner: "me", // Since we filtered by userId, all will be "me"
          starred,
          lastModified: updatedAt,
        };

        const currentDate = updatedAt.toISOString().split("T")[0];

        if (Boolean(formattedFiles[currentDate])) {
          formattedFiles[currentDate].push(obj);
        } else {
          formattedFiles[currentDate] = [obj];
        }
      }
    );

    // Sort the dates in descending order (newest first)
    const sortedFiles = {};
    Object.keys(formattedFiles)
      .sort((a, b) => new Date(b) - new Date(a)) // Sort dates in descending order
      .forEach((date) => {
        sortedFiles[date] = formattedFiles[date];
      });

    return res.status(200).json({
      status: true,
      files: sortedFiles,
    });
  } catch (error) {
    next(error);
  }
}

// ### ADD OR REMOVE STAR FROM A FILE
export async function changeStarOfFile(req, res, next) {
  try {
    const { success, data, error } = changeStarOfFileSchema.safeParse({
      body: req.body,
      params: req.params,
    });

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }

    const { isStarred } = data.body;
    const { fileId } = data.params;

    // checking user permission
    const foundFile = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    })
      .select("_id starred")
      .lean();

    if (!foundFile) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: {
          message: "You don't have access to this File or it does not exist.",
        },
      });
    }

    await File.findByIdAndUpdate(foundFile._id, { starred: isStarred });
    return res.status(200).json({
      status: true,
      message: isStarred
        ? "File is added to Starred"
        : "File is removed from Starred",
    });
  } catch (error) {
    next(error);
  }
}
