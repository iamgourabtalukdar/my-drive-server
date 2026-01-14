import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getCloudFrontSignedURL } from "@aws-sdk/cloudfront-signer";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import mongoose from "mongoose";
import path from "path";
import File from "../models/File.model.js";
import Folder from "../models/Folder.model.js";
import Upload from "../models/Upload.model.js";
import User from "../models/User.model.js";
import AppError from "../utils/AppError.js";
import s3Client from "../utils/s3Client.js";
import { updateFolderSize } from "../utils/utils.js";

// ### SERVING FILE
export async function serveFile({ fileId, userId }) {
  const foundFile = await File.findOne({ _id: fileId, userId })
    .select("name s3Key size extension mimetype")
    .lean();

  if (!foundFile) {
    throw new AppError("File not found or access denied", 404);
  }

  // const disposition =
  //   req.query.action === "download"
  //     ? `attachment; filename="${foundFile.name}${foundFile.extension}"`
  //     : `inline; filename="${foundFile.name}${foundFile.extension}"`;

  const url = `https://${process.env.AWS_CLOUDFRONT_DISTRIBUTION}/${foundFile.s3Key}`;
  const keyPairId = process.env.AWS_CLOUDFRONT_KEY_PAIR_ID;
  const privateKey = process.env.AWS_CLOUDFRONT_PRIVATE_KEY.replace(
    /\\n/g,
    "\n"
  );
  const expiresIn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
  const signedUrl = getCloudFrontSignedURL({
    url,
    keyPairId,
    dateLessThan: expiresIn,
    privateKey,
  });

  return signedUrl;
}

// ### UPLOAD INITIATION
export const uploadInitiate = async ({ meta, userId }) => {
  const { name: filename, size: filesize, contentType, parentFolderId } = meta;

  const parentFolderExists = await Folder.findById(parentFolderId)
    .select("userId")
    .lean();

  if (!parentFolderExists) {
    throw new AppError("Parent folder not found", 404);
  }

  // 3. Check Permissions
  if (!parentFolderExists.userId.equals(userId)) {
    throw new AppError("You don't have permission", 401);
  }

  // 4. Check Storage Quota
  const user = await User.findById(userId)
    .select("-_id storageSize rootFolderId")
    .populate({ path: "rootFolderId", select: "-_id, size" })
    .lean();

  const totalStorageSize = user.storageSize || 0;
  const usedStorageSize = user.rootFolderId.size || 0;
  const availableStorageSize = totalStorageSize - usedStorageSize;

  if (filesize > availableStorageSize) {
    throw new AppError("You don't have enough storage to upload file(s)", 507);
  }

  // Generate Unique S3 Key
  const extension = path.extname(filename);
  const fileNameWithoutExt = path.basename(filename, extension);
  const key = `${userId}/${crypto.randomUUID()}${extension}`;

  // Generate Pre-Signed URL
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: filesize,
    Metadata: {
      fileName: fileNameWithoutExt,
      extension,
      fileSize: filesize.toString(),
      parentFolderId: parentFolderId.toString(),
      userId: userId.toString(),
    },
  });

  const signedUrl = await getS3SignedUrl(s3Client, command, {
    expiresIn: 60 * 60 * 2, //  2 hours
  });

  const upload = await Upload.create({
    userId,
    key,
    fileName: fileNameWithoutExt,
    extension,
    contentType,
    fileSize: filesize,
    parentFolderId,
  });

  return {
    uploadId: upload._id,
    signedUrl,
  };
};

// ### UPLOAD COMPLETION
export async function uploadComplete({ uploadId, userId }) {
  const upload = await Upload.findById(uploadId);
  if (!upload) throw new AppError("Upload Id not found", 404);

  if (upload.userId.toString() !== userId.toString()) {
    throw new AppError(
      "You don't have permission to complete this upload",
      403
    );
  }

  if (upload.status !== "initiated") {
    throw new AppError("Upload already processed", 400);
  }

  const headCommand = new HeadObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: upload.key,
  });
  let head;
  try {
    head = await s3Client.send(headCommand);
  } catch (s3Error) {
    throw new AppError(
      "File not found in storage. Did the upload finish?",
      400
    );
  }
  // Security: Prevent storage quota cheating
  // Ensure the file size in S3 matches what the frontend claims
  if (head.ContentLength !== upload.fileSize) {
    throw new AppError("File size mismatch", 400);
  }

  if (head.ContentType !== upload.contentType) {
    throw new AppError("File type mismatch", 400);
  }

  const parentFolder = await Folder.findOne({
    _id: upload.parentFolderId,
    userId,
  });

  if (!parentFolder) {
    throw new AppError("Parent folder not found or access denied", 404);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newFile = new File({
      name: upload.fileName,
      size: upload.fileSize,
      extension: upload.extension,
      contentType: upload.contentType,
      userId,
      parentFolderId: upload.parentFolderId,
      s3Key: upload.key,
    });

    await newFile.save({ session });

    // UPDATE USER STORAGE QUOTA
    await User.findByIdAndUpdate(
      userId,
      { $inc: { storageSize: upload.fileSize } },
      { session }
    );

    // 6. UPDATE FOLDER SIZE
    await updateFolderSize(upload.parentFolderId, upload.fileSize, session);

    upload.status = "completed";
    await upload.save({ session });
    // 7. COMMIT TRANSACTION
    await session.commitTransaction();

    return newFile;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// ### SERVING RECENT FILES
export async function getRecentFiles({ userId }) {
  const foundFiles = await File.find({
    userId,
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
        owner: "me",
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

  return sortedFiles;
}

// ### UPDATE FILE
export async function updateFile({ userId, fileId, updateObj }) {
  const file = await File.findOne({
    _id: fileId,
    userId,
  });

  if (!file) {
    throw new AppError("File not found or access denied.", 404);
  }
  const { name, isTrashed, starred } = updateObj;
  if (name !== undefined) {
    file.name = name;
  }
  if (isTrashed !== undefined) {
    file.isTrashed = isTrashed;
  }
  if (starred !== undefined) {
    file.starred = starred;
  }
  await file.save();

  return file;
}

// ### PERMANENTLY DELETE FILE
export async function deleteFile({ userId, fileId }) {
  const foundFile = await File.findOne({
    _id: fileId,
    userId,
  })
    .select("_id isTrashed size parentFolderId s3Key")
    .lean();

  if (!foundFile) {
    throw new AppError("File not found or access denied.", 404);
  }

  if (!foundFile.isTrashed) {
    throw new AppError("File is not in Trash", 400);
  }

  const { size, parentFolderId, s3Key } = foundFile;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // --- MONGODB DELETION ---
    await File.findByIdAndDelete(foundFile._id, { session });

    // Decrease Folder Size
    await updateFolderSize(parentFolderId, -size, session);
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

  // ---------------------------------------------------------
  // DELETE FROM S3 (After Commit)
  // ---------------------------------------------------------
  if (s3Key) {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
      });
      await s3Client.send(deleteCommand);
    } catch (s3Error) {
      // CRITICAL: Do NOT throw here.
      // The file is already gone from the user's view (DB).
      // If S3 fails, we just have an "orphaned" file.
      // Solution: Log this error to a monitoring service (like Sentry or CloudWatch)
      console.error(`FAILED TO DELETE S3 OBJECT: ${s3Key}`, s3Error);
    }
  }
  return true;
}
