import * as services from "../services/file.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// ### SERVING FILE
export const serveFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  const signedUrl = await services.serveFile({ fileId, userId: req.user._id });

  return res.json({
    status: true,
    url: signedUrl,
  });
});

// ### UPLOAD INITIATION
export const uploadInitiate = asyncHandler(async (req, res) => {
  const { uploadId, signedUrl } = await services.uploadInitiate({
    meta: {
      ...req.body,
      parentFolderId: req.body.parentFolderId || req.user.rootFolderId,
    },
    userId: req.user._id,
  });

  return res.status(200).json({
    status: true,
    message: "Upload initiated successfully.",
    uploadId,
    signedUrl,
  });
});

// ### UPLOAD COMPLETION
export const uploadComplete = asyncHandler(async (req, res) => {
  const newFile = await services.uploadComplete({
    uploadId: req.body.uploadId,
    userId: req.user._id,
  });

  return res.status(201).json({
    status: true,
    file: newFile,
  });
});

// ### SERVING RECENT FILES
export const getRecentFiles = asyncHandler(async (req, res) => {
  const recentFiles = await services.getRecentFiles({ userId: req.user._id });

  return res.status(200).json({
    status: true,
    files: recentFiles,
  });
});

// ### UPDATE FILE
export const updateFile = asyncHandler(async (req, res) => {
  const updateObj = req.body;
  const fileId = req.params.fileId;

  await services.updateFile({
    userId: req.user._id,
    fileId,
    updateObj,
  });

  return res
    .status(200)
    .json({ status: true, message: "File updated successfully." });
});

// ### PERMANENTLY DELETE FILE
export const deleteFile = asyncHandler(async (req, res) => {
  const fileId = req.params.fileId;

  await services.deleteFile({
    userId: req.user._id,
    fileId,
  });

  return res
    .status(200)
    .json({ status: true, message: "File deleted permanently." });
});
