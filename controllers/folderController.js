import mongoose from "mongoose";
import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";
import { clearAuthCookie } from "../utils/clearAuthCookies.js";

// ### SERVING FOLDER CONTENT
export async function getFolder(req, res, next) {
  try {
    const folderId = req.params.folderId || req.user.rootFolderId;

    if (!mongoose.isValidObjectId(folderId)) {
      return res
        .status(400)
        .json({ status: false, errors: { message: "Invalid Folder Id" } });
    }

    // First check if the folder exists and belongs to the user
    const folder = await Folder.findOne({
      _id: folderId,
      userId: req.user._id,
    });

    if (!folder) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: { message: "You don't have access to this folder" },
      });
    }

    // Now get nested folders & files (since we confirmed ownership)
    const nestedFolders = await Folder.find({
      userId: req.user._id,
      parentFolderId: folderId,
    }).lean();

    // Now get nested folders (since we confirmed ownership)
    const nestedFiles = await File.find({
      userId: req.user._id,
      parentFolderId: folderId,
      isTrashed: false,
    }).lean();

    const formattedNestedFolders = nestedFolders.map(
      ({ _id, name, userId, updatedAt, starred }) => {
        // const owner = String(userId) === String(req.user._id) ? "me" : "other";
        return {
          id: _id,
          name,
          owner: "me", // Since we filtered by userId, all will be "me"
          starred,
          lastModified: updatedAt,
        };
      }
    );
    const formattedNestedFiles = nestedFiles.map(
      ({ _id, name, size, extension, userId, updatedAt, starred }) => {
        // const owner = String(userId) === String(req.user._id) ? "me" : "other";
        return {
          id: _id,
          name,
          extension,
          size,
          owner: "me", // Since we filtered by userId, all will be "me"
          starred,
          lastModified: updatedAt,
        };
      }
    );
    return res.status(200).json({
      status: true,
      folders: formattedNestedFolders,
      files: formattedNestedFiles,
    });
  } catch (error) {
    next(error);
  }
}

// ### CREATING NEW FOLDER
export async function createFolder(req, res, next) {
  try {
    const folderName = req.body?.name?.trim() || "New Folder";

    // validating folder name
    if (folderName.length > 30) {
      return res.status(400).json({
        status: false,
        errors: { message: "Folder name cannot exceed 30 characters" },
      });
    }

    // creating parent folder id
    const parentFolderId =
      req.headers["parent-folder-id"] || req.user.rootFolderId;

    // checking parent  folder id
    if (!mongoose.isValidObjectId(parentFolderId)) {
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid parent folder id" },
      });
    }

    const id = new mongoose.Types.ObjectId();
    await Folder.insertOne({
      _id: id,
      name: folderName,
      userId: req.user._id,
      parentFolderId,
    });
    return res
      .status(201)
      .json({ status: true, message: "New Folder Created" });
  } catch (error) {
    next(error);
  }
}

// ### RENAMING FOLDER
export async function renameFolder(req, res, next) {
  try {
    const newFolderName = req.body?.newName?.trim();
    const folderId = req.params.folderId;

    // validating folder name
    if (!newFolderName) {
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid Folder name" },
      });
    }
    // validating folder name length
    if (newFolderName.length > 30) {
      return res.status(400).json({
        status: false,
        errors: { message: "Folder name cannot exceed 30 characters" },
      });
    }
    // checking validity of folder id
    if (!mongoose.isValidObjectId(folderId)) {
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid Folder ID" },
      });
    }

    // checking user permission
    const foundFolderId = await Folder.findOne({
      _id: folderId,
      userId: req.user._id,
    })
      .select("_id")
      .lean();

    if (!foundFolderId) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: { message: "You don't have access to this folder" },
      });
    }

    await Folder.findByIdAndUpdate(foundFolderId, { name: newFolderName });
    return res.status(200).json({ status: true, message: "Folder renamed" });
  } catch (error) {
    next(error);
  }
}
