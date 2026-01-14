import * as services from "../services/folder.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// ### SERVING ROOT FOLDER CONTENT
export const getRootFolder = asyncHandler(async (req, res) => {
  const folderId = req.user.rootFolderId;

  const { folders, files } = await services.getFolderContent({
    userId: req.user._id,
    folderId,
  });

  return res.status(200).json({
    status: true,
    folders,
    files,
  });
});

// ### SERVING FOLDER CONTENT
export const getFolderContent = asyncHandler(async (req, res) => {
  const folderId = req.params.folderId || req.user.rootFolderId;

  const { folders, files } = await services.getFolderContent({
    userId: req.user._id,
    folderId,
  });

  return res.status(200).json({
    status: true,
    folders,
    files,
  });
});

// ### CREATING NEW FOLDER
export const createFolder = asyncHandler(async (req, res) => {
  const name = req.body.name;
  const parentFolderId = req.body.parentFolderId || req.user.rootFolderId;

  const newFolder = await services.createFolder({
    userId: req.user._id,
    name,
    parentFolderId,
  });

  return res.status(201).json({
    status: true,
    message: "Folder created successfully.",
    folder: newFolder,
  });
});

// ### UPDATE FOLDER
export const updateFolder = asyncHandler(async (req, res) => {
  const updateObj = req.body;
  const folderId = req.params.folderId;

  await services.updateFolder({
    userId: req.user._id,
    folderId,
    updateObj,
  });

  return res
    .status(200)
    .json({ status: true, message: "Folder updated successfully." });
});

// ### DELETE FOLDER
export const deleteFolder = asyncHandler(async (req, res) => {
  const folderId = req.params.folderId;

  await services.deleteFolder({
    userId: req.user._id,
    folderId,
  });

  return res
    .status(200)
    .json({ status: true, message: "Folder deleted permanently." });
});
