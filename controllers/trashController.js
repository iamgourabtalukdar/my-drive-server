import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";

// ### SERVING TRASH CONTENT
export async function getTrashContent(req, res, next) {
  try {
    const parentFolderId = req.user.rootFolderId;
    // Find all the trashed folder belongs to the user
    const trashedFolders = await Folder.find({
      userId: req.user._id,
      parentFolderId,
      isTrashed: true,
    }).lean();

    // Now get nested folders (since we confirmed ownership)
    const trashedFiles = await File.find({
      userId: req.user._id,
      parentFolderId,
      isTrashed: true,
    }).lean();

    const formattedTrashedFolders = trashedFolders.map(
      ({ _id, name, userId, updatedAt, starred }) => {
        // const owner = String(userId) === String(req.user._id) ? "me" : "other";
        return {
          id: _id,
          name,
          owner: "me", // Since we filtered by userId, all will be "me"
          starred,
          lastModified: updatedAt,
        };
      }
    );
    const formattedTrashedFiles = trashedFiles.map(
      ({ _id, name, size, extension, userId, updatedAt, starred }) => {
        // const owner = String(userId) === String(req.user._id) ? "me" : "other";
        return {
          id: _id,
          name,
          extension,
          size,
          owner: "me", // Since we filtered by userId, all will be "me"
          starred,
          lastModified: updatedAt,
        };
      }
    );

    return res.status(200).json({
      status: true,
      folders: formattedTrashedFolders,
      files: formattedTrashedFiles,
    });
  } catch (error) {
    next(error);
  }
}
