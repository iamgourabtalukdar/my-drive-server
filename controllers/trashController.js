import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";

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
      folders: formattedRootTrashedFolders,
      files: formattedTrashedFiles,
    });
  } catch (error) {
    next(error);
  }
}
