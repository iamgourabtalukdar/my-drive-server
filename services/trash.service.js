import File from "../models/File.model.js";
import Folder from "../models/Folder.model.js";

// ### SERVING TRASH CONTENT
export async function getTrashContent({ userId }) {
  // Get all trashed folders in a single optimized query
  const trashedFolders = await Folder.find({
    userId,
    isTrashed: true,
  })
    .select("_id name size userId parentFolderId updatedAt isStarred")
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
    .select("_id name size extension userId updatedAt isStarred")
    .lean();

  // format the folders
  const formattedRootTrashedFolders = rootTrashedFolders.map(
    ({ _id, name, size, updatedAt, isStarred }) => ({
      id: _id,
      name,
      size: size.toString(),
      owner: "me",
      isStarred,
      isTrashed: true,
      lastModified: updatedAt,
    })
  );
  // format the files
  const formattedTrashedFiles = trashedFiles.map(
    ({ _id, name, size, extension, updatedAt, isStarred }) => ({
      id: _id,
      name,
      extension,
      size: size.toString(),
      owner: "me",
      isStarred,
      isTrashed: true,
      lastModified: updatedAt,
    })
  );

  return {
    folders: formattedRootTrashedFolders,
    files: formattedTrashedFiles,
  };
}
