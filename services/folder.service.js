import mongoose from "mongoose";
import File from "../models/File.model.js";
import Folder from "../models/Folder.model.js";
import AppError from "../utils/AppError.js";
import { getInnerFilesFolders, updateFolderSize } from "../utils/utils.js";
import s3Client from "../utils/s3Client.js";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

export async function getFolderContent({ userId, folderId }) {
  const folder = await Folder.findOne({
    _id: folderId,
    userId,
  })
    .select("_id isTrashed")
    .lean();

  if (!folder) {
    throw new AppError("Invalid credentials", 401);
  }

  if (folder.isTrashed) {
    throw new AppError("Folder is in Trash", 400);
  }

  const [nestedFolders, nestedFiles] = await Promise.all([
    Folder.find({
      userId,
      parentFolderId: folderId,
      isTrashed: false,
    })
      .select("name starred size updatedAt")
      .lean(),
    File.find({
      userId,
      parentFolderId: folderId,
      isTrashed: false,
    })
      .select("name extension size starred updatedAt")
      .lean(),
  ]);

  // 3. Format the results for the client. This logic remains the same.
  const formattedNestedFolders = nestedFolders.map(
    ({ _id, name, starred, size, updatedAt }) => ({
      id: _id,
      name,
      owner: "me",
      isStarred: starred,
      isTrashed: false,
      size: size.toString(),
      lastModified: updatedAt,
    })
  );

  const formattedNestedFiles = nestedFiles.map(
    ({ _id, name, extension, size, starred, updatedAt }) => ({
      id: _id,
      name,
      extension,
      size,
      owner: "me",
      isStarred: starred,
      isTrashed: false,
      lastModified: updatedAt,
    })
  );

  return { folders: formattedNestedFolders, files: formattedNestedFiles };
}

export async function createFolder({ userId, name, parentFolderId }) {
  const parentFolder = await Folder.findOne({
    _id: parentFolderId,
    userId,
  })
    .select("_id")
    .lean();

  if (!parentFolder) {
    throw new AppError("You don't have access to the parent folder.", 403);
  }

  const newFolder = await Folder.create({
    name,
    userId,
    parentFolderId,
  });

  return newFolder;
}

export async function updateFolder({ userId, folderId, updateObj }) {
  const folder = await Folder.findOne({
    _id: folderId,
    userId,
  });

  if (!folder) {
    throw new AppError("Folder not found or access denied.", 404);
  } else if (folder.parentFolderId === null) {
    throw new AppError("Cannot update the root folder.", 400);
  }
  const { name, isTrashed, starred } = updateObj;
  if (name !== undefined) {
    folder.name = name;
  }
  if (isTrashed !== undefined) {
    folder.isTrashed = isTrashed;
  }
  if (starred !== undefined) {
    folder.starred = starred;
  }
  await folder.save();

  return folder;
}

// ### PERMANENTLY DELETE FOLDER AND INNER FILES, FOLDERS FROM TRASH
export async function deleteFolder({ userId, folderId }) {
  const foundFolder = await Folder.findOne({
    _id: folderId,
    userId,
  })
    .select("_id isTrashed size parentFolderId")
    .lean();

  if (!foundFolder) {
    throw new AppError("Folder not found or access denied.", 404);
  }

  //checking if folder not in trash
  if (!foundFolder.isTrashed) {
    throw new AppError("Folder is not in Trash.", 400);
  }

  // finding nested files & folders (to N-th level deep)
  const { files, folders } = await getInnerFilesFolders(folderId);

  //adding current folder
  folders.push({ _id: foundFolder._id });

  const s3ObjectsToDelete = files
    .filter((f) => f.s3Key)
    .map((file) => ({ Key: file.s3Key }));

  // starting transactions
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Folder.deleteMany(
      { _id: { $in: folders.map((folder) => folder._id) } },
      { session }
    );
    await File.deleteMany(
      { _id: { $in: files.map((file) => file._id) } },
      { session }
    );

    if (foundFolder.size > 0) {
      // update folder sizes by subtracting file sizes
      await updateFolderSize(
        foundFolder.parentFolderId,
        -foundFolder.size,
        session
      );
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  // AWS S3 Batch Delete
  if (s3ObjectsToDelete.length > 0) {
    try {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Delete: {
          Objects: s3ObjectsToDelete,
          Quiet: true,
        },
      });
      await s3Client.send(deleteCommand);
    } catch (s3Error) {
      console.error("BACKGROUND JOB: Failed to clean up S3 files", s3Error);
    }
  }

  return true;
}
