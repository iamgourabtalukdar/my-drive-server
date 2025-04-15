import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";
import mongoose from "mongoose";

// ### SERVING STARRED CONTENT
export async function getStarredContent(req, res, next) {
  try {
    const userId = req.user._id;

    // Get all starred folders in a single optimized query
    const starredFolders = await Folder.find({
      userId,
      starred: true,
      isTrashed: false,
    })
      .select("_id name userId parentFolderId updatedAt starred")
      .lean();

    // Get files that are in any starred folder (including nested ones)
    const starredFiles = await File.find({
      userId,
      starred: true,
      isTrashed: false,
    })
      .select("_id name size extension userId updatedAt starred")
      .lean();

    // format the folders
    const formattedStarredFolders = starredFolders.map(
      ({ _id, name, updatedAt, starred }) => ({
        id: _id,
        name,
        owner: "me",
        starred,
        lastModified: updatedAt,
      })
    );
    // format the files
    const formattedStarredFiles = starredFiles.map(
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
      folders: formattedStarredFolders,
      files: formattedStarredFiles,
    });
  } catch (error) {
    next(error);
  }
}

// ### ADD OR REMOVE STAR FROM A FILE
export async function changeStarredFile(req, res, next) {
  try {
    const starred = req.body?.starred;
    const fileId = req.params.fileId;

    if (!(typeof starred === "boolean")) {
      return res.status(400).json({
        status: false,
        errors: {
          message: "A Boolean value (true, false) is expected for starred",
        },
      });
    }
    if (!mongoose.isValidObjectId(fileId)) {
      // checking validity of file id
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid File ID" },
      });
    }

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
        errors: { message: "You don't have access to this File" },
      });
    }

    if (foundFile.starred === starred) {
      return res.status(400).json({
        status: false,
        errors: {
          message: starred
            ? "File is already added to Starred"
            : "File is already not in Starred",
        },
      });
    }

    await File.findByIdAndUpdate(foundFile._id, { starred });
    return res.status(200).json({
      status: true,
      message: starred
        ? "File is added to Starred"
        : "File is removed from Starred",
    });
  } catch (error) {
    next(error);
  }
}

// ### ADD OR REMOVE STAR FROM A FOLDER
export async function changeStarredFolder(req, res, next) {
  try {
    const starred = req.body?.starred;
    const folderId = req.params.folderId;

    if (!(typeof starred === "boolean")) {
      return res.status(400).json({
        status: false,
        errors: {
          message: "A Boolean value (true, false) is expected for starred",
        },
      });
    }
    if (!mongoose.isValidObjectId(folderId)) {
      // checking validity of folder id
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
      .select("_id starred")
      .lean();

    if (!foundFolder) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: { message: "You don't have access to this Folder" },
      });
    }

    if (foundFolder.starred === starred) {
      return res.status(400).json({
        status: false,
        errors: {
          message: starred
            ? "Folder is already added to Starred"
            : "Folder is already not in Starred",
        },
      });
    }

    await Folder.findByIdAndUpdate(foundFolder._id, { starred });
    return res.status(200).json({
      status: true,
      message: starred
        ? "Folder is added to Starred"
        : "Folder is removed from Starred",
    });
  } catch (error) {
    next(error);
  }
}
