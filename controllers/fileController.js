import mongoose from "mongoose";
import path from "path";
import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";
import {
  changeStarOfFileSchema,
  moveFileToTrashSchema,
  renameFileSchema,
  serveFileSchema,
  uploadCompleteSchema,
  uploadInitiateSchema,
} from "../validators/fileSchema.js";
import { z } from "zod/v4";
import { updateFolderSize } from "../utils/utils.js";
import User from "../models/userModel.js";
import { v4 as uuidv4 } from "uuid";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../utils/s3Client.js";
import mime from "mime-types";

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
      .select("name s3Key size extension mimetype")
      .lean();

    if (!foundFile) {
      return res.status(400).json({
        status: false,
        errors: { message: "File Not Found Or You don't have the permission" },
      });
    }

    const disposition =
      req.query.action === "download"
        ? `attachment; filename="${foundFile.name}${foundFile.extension}"`
        : `inline; filename="${foundFile.name}${foundFile.extension}"`;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: foundFile.s3Key,
      ResponseContentType: foundFile.mimetype,
      ResponseContentDisposition: disposition,
    });

    // Generate a URL valid for 5 minutes (300 seconds)
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    return res.redirect(signedUrl);
  } catch (error) {
    next(error);
  }
}

// ### UPLOAD INITIATION
export async function uploadInitiate(req, res, next) {
  try {
    const { success, data, error } = uploadInitiateSchema.safeParse({
      body: req.body,
    });

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }
    // 1. Get Metadata from Request
    const {
      name: filename,
      size: filesize,
      contentType, // Crucial for S3 signature
    } = data.body;

    const parentFolderId = data.body.parentFolderId || req.user.rootFolderId;

    const parentFolderExists = await Folder.findById(parentFolderId)
      .select({ userId: 1 })
      .lean();

    if (!parentFolderExists) {
      return res.status(404).json({
        error: "Error while uploading: Parent Folder Not Found",
      });
    }

    // 3. Check Permissions
    if (!parentFolderExists.userId.equals(req.user._id)) {
      return res.status(401).json({ error: "You don't have permission" });
    }

    // 4. Check Storage Quota
    const user = await User.findById(req.user._id)
      .select("-_id storageSize rootFolderId")
      .populate({ path: "rootFolderId", select: "-_id, size" })
      .lean();

    const totalStorageSize = user.storageSize || 0;
    const usedStorageSize = user.rootFolderId.size || 0;
    const availableStorageSize = totalStorageSize - usedStorageSize;

    if (filesize > availableStorageSize) {
      return res.status(507).json({
        status: false,
        errors: { message: "You don't have enough storage to upload file(s)" },
      });
    }

    // 5. Generate Unique S3 Key
    // Format: userId/uuid-cleanFilename.ext
    const extension = path.extname(filename);
    const cleanName = filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, "-");
    const s3Key = `${req.user._id}/${uuidv4()}-${cleanName}${extension}`;

    // 6. Generate Pre-Signed URL
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType, // Must match what frontend sends
      Metadata: {
        originalName: filename,
        userId: req.user._id.toString(),
      },
    });

    // Link expires in 15 minutes (900 seconds)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    // 7. Respond to Frontend
    // We DO NOT save to MongoDB yet. We wait for the 'uploadComplete' call.
    return res.status(200).json({
      status: true,
      data: {
        message: "Upload initiation successful",
        signedUrl,
        fileKey: s3Key,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ### UPLOAD COMPLETION
export async function uploadComplete(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { success, data, error } = uploadCompleteSchema.safeParse({
      body: req.body,
    });
    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }
    const { name, size, fileKey } = data.body;

    const parentFolderId = data.body.parentFolderId || req.user.rootFolderId;

    // 2. VERIFY FILE EXISTS IN AWS S3 (Security Check)
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
      });
      const s3Metadata = await s3Client.send(headCommand);

      // Security: Prevent storage quota cheating
      // Ensure the file size in S3 matches what the frontend claims
      if (s3Metadata.ContentLength !== size) {
        throw new Error("File size mismatch. Integrity check failed.");
      }
    } catch (s3Error) {
      if (s3Error.name === "NotFound") {
        return res.status(404).json({
          status: false,
          message: "File not found in storage bucket. Upload may have failed.",
        });
      }
      throw s3Error; // Rethrow other AWS errors
    }

    const userId = req.user._id;

    // 3. CHECK PARENT FOLDER
    const parentFolder = await Folder.findOne({
      _id: parentFolderId,
      userId: userId,
    }).session(session);

    if (!parentFolder) {
      return res.status(404).json({
        status: false,
        message: "Parent folder not found or access denied.",
      });
    }

    // 4. CREATE FILE DOCUMENT
    // We strip the extension from the name for the DB "name" field,
    // as we store extension separately.
    const extension = name.substring(name.lastIndexOf("."));
    const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
    const mimetype = mime.lookup(extension) || "application/octet-stream";

    const newFile = new File({
      name: nameWithoutExt,
      size,
      extension,
      mimetype,
      userId,
      parentFolderId,
      s3Key: fileKey, // IMPORTANT: Save the S3 key provided by initiate
      isUploading: false, // It's done
    });

    await newFile.save({ session });

    // 5. UPDATE USER STORAGE QUOTA
    await User.findByIdAndUpdate(
      userId,
      { $inc: { storageSize: size } },
      { session }
    );

    // 6. UPDATE FOLDER SIZE
    await updateFolderSize(parentFolderId, size, session);

    // 7. COMMIT TRANSACTION
    await session.commitTransaction();

    return res.status(201).json({
      status: true,
      data: {
        message: "File uploaded and verified successfully.",
        file: newFile,
      },
    });
  } catch (error) {
    // If anything fails, undo all DB changes
    await session.abortTransaction();
    console.error("Upload Complete Error:", error);
    next(error);
  } finally {
    session.endSession();
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
