import mongoose from "mongoose";
import Folder from "../models/folderModel.js";
import { clearAuthCookie } from "../utils/clearAuthCookies.js";

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

    // Now get nested folders (since we confirmed ownership)
    const nestedFolders = await Folder.find({
      userId: req.user._id,
      parentFolderId: folderId,
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
    return res
      .status(200)
      .json({ status: true, folders: formattedNestedFolders, files: [] });
  } catch (error) {
    next(error);
  }
}

export async function createFolder(req, res, next) {
  try {
    const folderName = req.body.name?.trim() || "New Folder";

    // validating folder name
    if (folderName.length > 30) {
      console.log(folderName);
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
