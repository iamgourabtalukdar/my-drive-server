import mongoose from "mongoose";
import path from "path";
import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";

export async function uploadFiles(req, res, next) {
  try {
    const uploadedFiles = req.files;

    if (!uploadedFiles) {
      return res.status(400).json({
        status: false,
        errors: { message: "No File found to upload" },
      });
    }
    // const folderId = req.body.folderId;
    const parentFolderId =
      req.headers["parent-folder-id"] || req.user.rootFolderId;

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
    // const savedFiles = await Promise.all(
    //   uploadedFiles.map((file, i) => {
    //     return new File({
    //       _id: req.generatedFileIds[i],
    //       name: file.originalname.replace(/\.[^.\s]+$/, ""),
    //       extension: path.extname(file.originalname),
    //       mimetype: file.mimetype,
    //       size: file.size,
    //       parentFolderId,
    //       userId: req.user._id,
    //     }).save();
    //   })
    // );

    return res.status(201).json({
      status: true,
      message: "Files uploaded successfully",
    });
  } catch (error) {
    next(error);
  }
}
