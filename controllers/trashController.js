import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";
import mongoose from "mongoose";
import {
  getInnerFilesFolders,
  clearAuthCookie,
  updateFolderSize,
} from "../utils/utils.js";
import path from "path";
import { unlink } from "fs/promises";
import { serveFileSchema } from "../validators/fileSchema.js";
import { z } from "zod/v4";
import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import s3Client from "../utils/s3Client.js";
import { deleteFolderSchema } from "../validators/trashSchema.js";

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

// ### PERMANENTLY DELETE FOLDER AND INNER FILES, FOLDERS FROM TRASH
export async function deleteFolder(req, res, next) {
  try {
    const { success, data, error } = deleteFolderSchema.safeParse({
      params: req.params,
    });

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }

    const { folderId } = data.params;

    // checking user permission
    const foundFolder = await Folder.findOne({
      _id: folderId,
      userId: req.user._id,
    })
      .select("_id isTrashed size parentFolderId")
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

      if (files.length > 0) {
        // 1. Prepare S3 Objects for Deletion (Filter out files without keys to prevent errors)
        const objectsToDelete = files
          .filter((f) => f.s3Key)
          .map((file) => ({ Key: file.s3Key }));

        // 2. AWS S3 Batch Delete
        if (objectsToDelete.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Delete: {
              Objects: objectsToDelete,
              Quiet: true,
            },
          });
          await s3Client.send(deleteCommand);
        }
      }

      await Folder.deleteMany(
        { _id: { $in: folders.map((folder) => folder._id) } },
        { session }
      );
      await File.deleteMany(
        { _id: { $in: files.map((file) => file._id) } },
        { session }
      );

      // update folder sizes by subtracting file sizes
      await updateFolderSize(
        foundFolder.parentFolderId,
        -foundFolder.size,
        session
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

// ### PERMANENTLY DELETE FILE FROM TRASH
export async function deleteFile(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
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

    // checking user permission
    const foundFile = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    })
      .select("_id isTrashed size parentFolderId s3Key")
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

    const { size, parentFolderId, s3Key } = foundFile;

    if (s3Key) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
      });
      await s3Client.send(deleteCommand);
    }

    // --- MONGODB DELETION ---
    await File.findByIdAndDelete(foundFile._id, { session });

    // Decrease Folder Size
    await updateFolderSize(parentFolderId, -size, session);

    await session.commitTransaction();

    return res.status(200).json({
      status: true,
      message: "File is deleted permanently",
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
}
