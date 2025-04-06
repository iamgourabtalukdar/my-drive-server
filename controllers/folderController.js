import mongoose from "mongoose";
import Folder from "../models/folderModel.js";

export async function getFolder(req, res, next) {
  return res.status(200).json({});
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
    //finding user

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
