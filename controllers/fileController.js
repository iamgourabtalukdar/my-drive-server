import mongoose from "mongoose";
import path from "path";
import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";

// ### SERVING FILE
export async function serveFile(req, res, next) {
  try {
    const fileId = req.params.fileId;

    if (!fileId || !mongoose.isValidObjectId(fileId)) {
      return res
        .status(400)
        .json({ status: false, errors: { message: "Invalid file ID" } });
    }

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
    // const parentFolderId =
    //   req.headers["parent-folder-id"] || req.user.rootFolderId;

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

    await File.insertMany(fileDocs, { ordered: false });

    return res.status(201).json({
      status: true,
      message: "Files uploaded successfully",
    });
  } catch (error) {
    next(error);
  }
}

// ### RENAMING FILE
export async function renameFile(req, res, next) {
  try {
    const { name } = req.body;
    const { fileId } = req.params;

    // 1. Combine all input validations at the top.
    const trimmedName = name?.trim();
    if (!trimmedName || trimmedName.length > 50) {
      return res.status(400).json({
        status: false,
        errors: { message: "Folder name must be between 1 and 50 characters." },
      });
    }

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

    await File.findByIdAndUpdate(foundFileId, { name: trimmedName });
    return res.status(200).json({ status: true, message: "File renamed" });
  } catch (error) {
    next(error);
  }
}

// ### MOVE FILE TO TRASH
export async function moveFileToTrash(req, res, next) {
  try {
    const { fileId } = req.params;

    // checking validity of folder id
    if (!mongoose.isValidObjectId(fileId)) {
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid Folder ID" },
      });
    }

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
    const { isStarred } = req.body;
    const { fileId } = req.params;

    if (!(typeof isStarred === "boolean")) {
      return res.status(400).json({
        status: false,
        errors: {
          message: "A Boolean value (true, false) is expected for starred",
        },
      });
    }
    if (!mongoose.isValidObjectId(fileId)) {
      // checking validity of file id
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid File ID" },
      });
    }

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
