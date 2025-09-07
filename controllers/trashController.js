import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";
import mongoose from "mongoose";
import { getInnerFilesFolders } from "../utils/getInnerFilesFolders.js";
import path from "path";
import { unlink } from "fs/promises";

// ### SERVING TRASH CONTENT
export async function getTrashContent(req, res, next) {
  try {
    const userId = req.user._id;

    // Get all trashed folders in a single optimized query
    const trashedFolders = await Folder.find({
      userId,
      isTrashed: true,
    })
      .select("_id name userId parentFolderId updatedAt starred")
      .lean();

    // Create a Set for faster lookups
    const folderIds = new Set(
      trashedFolders.map((folder) => folder._id.toString())
    );

    // Filter out folders that are children of other trashed folders
    const rootTrashedFolders = trashedFolders.filter((folder) => {
      const parentId = folder.parentFolderId?.toString();
      return !parentId || !folderIds.has(parentId);
    });

    // Get files that aren't in any trashed folder (including nested ones)
    const trashedFiles = await File.find({
      userId,
      isTrashed: true,
      parentFolderId: { $nin: [...folderIds] }, // Exclude files in any trashed folder
    })
      .select("_id name size extension userId updatedAt starred")
      .lean();

    // format the folders
    const formattedRootTrashedFolders = rootTrashedFolders.map(
      ({ _id, name, updatedAt, starred }) => ({
        id: _id,
        name,
        owner: "me",
        starred,
        lastModified: updatedAt,
      })
    );
    // format the files
    const formattedTrashedFiles = trashedFiles.map(
      ({ _id, name, size, extension, updatedAt, starred }) => ({
        id: _id,
        name,
        extension,
        size,
        owner: "me",
        starred,
        lastModified: updatedAt,
      })
    );

    return res.status(200).json({
      status: true,
      data: {
        folders: formattedRootTrashedFolders,
        files: formattedTrashedFiles,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ### RESTORE FOLDER FROM TRASH
export async function restoreFolderFromTrash(req, res, next) {
  try {
    const folderId = req.params.folderId;

    // checking validity of folder id
    if (!mongoose.isValidObjectId(folderId)) {
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid Folder ID" },
      });
    }

    // checking user permission
    const foundFolder = await Folder.findOne({
      _id: folderId,
      userId: req.user._id,
    })
      .select("_id isTrashed")
      .lean();

    if (!foundFolder) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: { message: "You don't have access to this folder" },
      });
    }

    //checking if folder not in trash
    if (!foundFolder.isTrashed) {
      return res.status(400).json({
        status: false,
        errors: { message: "Folder is not in Trash" },
      });
    }

    // finding nested files & folders (to N-th level deep)
    const { files, folders } = await getInnerFilesFolders(folderId);

    //adding current folder
    folders.push({ _id: foundFolder._id });

    // starting transactions
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      await Folder.updateMany(
        { _id: { $in: folders.map((folder) => folder._id) } },
        { isTrashed: false },
        { session }
      );
      await File.updateMany(
        { _id: { $in: files.map((file) => file._id) } },
        { isTrashed: false },
        { session }
      );

      await session.commitTransaction();

      return res
        .status(200)
        .json({ status: true, message: "Folder is restored from trash" });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    next(error);
  }
}

// ### DELETE FOLDER FROM TRASH
export async function deleteFolder(req, res, next) {
  try {
    const folderId = req.params.folderId;

    // checking validity of folder id
    if (!mongoose.isValidObjectId(folderId)) {
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid Folder ID" },
      });
    }

    // checking user permission
    const foundFolder = await Folder.findOne({
      _id: folderId,
      userId: req.user._id,
    })
      .select("_id isTrashed")
      .lean();

    if (!foundFolder) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: { message: "You don't have access to this folder" },
      });
    }

    //checking if folder not in trash
    if (!foundFolder.isTrashed) {
      return res.status(400).json({
        status: false,
        errors: { message: "Folder is not in Trash" },
      });
    }

    // finding nested files & folders (to N-th level deep)
    const { files, folders } = await getInnerFilesFolders(folderId);

    //adding current folder
    folders.push({ _id: foundFolder._id });

    // starting transactions
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // files.forEach(async (file) => {
      //   const fullPath = path.resolve(
      //     req.STORAGE_BASE_DIR,
      //     file._id + file.extension
      //   );
      //   await unlink(fullPath);
      // });

      await Promise.all(
        files.map(async (file) => {
          const fullPath = path.resolve(
            req.STORAGE_BASE_DIR,
            file._id + file.extension
          );
          return unlink(fullPath).catch((e) =>
            console.error(`Failed to delete file ${file._id}`, e)
          );
        })
      );

      await Folder.deleteMany(
        { _id: { $in: folders.map((folder) => folder._id) } },
        { session }
      );
      await File.deleteMany(
        { _id: { $in: files.map((file) => file._id) } },
        { session }
      );

      await session.commitTransaction();

      return res
        .status(200)
        .json({ status: true, message: "Folder is Deleted Permanently" });
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    next(error);
  }
}

// ### RESTORE FILE FROM TRASH
export async function restoreFileFromTrash(req, res, next) {
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
        errors: { message: "You don't have access to this File" },
      });
    }

    if (!foundFile.isTrashed) {
      return res.status(400).json({
        status: false,
        errors: { message: "File is not in Trash" },
      });
    }

    await File.findByIdAndUpdate(foundFile._id, { isTrashed: false });
    return res
      .status(200)
      .json({ status: true, message: "File is restored from trash" });
  } catch (error) {
    next(error);
  }
}

// ### DELETE FILE FROM TRASH
export async function deleteFile(req, res, next) {
  try {
    const fileId = req.params.fileId;

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
      .select("_id extension isTrashed")
      .lean();

    if (!foundFile) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: { message: "You don't have access to this File" },
      });
    }

    if (!foundFile.isTrashed) {
      return res.status(400).json({
        status: false,
        errors: { message: "File is not in Trash" },
      });
    }

    const fullFilePath = path.resolve(
      req.STORAGE_BASE_DIR,
      `${foundFile._id}${foundFile.extension}`
    );

    // await unlink(fullFilePath).catch((e) =>
    //   console.error(`Failed to delete file ${foundFile._id}`, e)
    // );

    // No need to use .catch() as this is the single file deletion process. if any error occurs it will be handled over global error middleware [message: Internal server error]
    await unlink(fullFilePath);

    await File.findByIdAndDelete(foundFile._id);

    return res.status(200).json({ status: true, message: "File is deleted" });
  } catch (error) {
    next(error);
  }
}
