import File from "../models/File.model.js";
import Folder from "../models/Folder.model.js";

// ### SERVING STARRED CONTENT
export async function getStarredItems({ userId }) {
  // Get all starred folders in a single optimized query
  const starredFolders = await Folder.find({
    userId,
    starred: true,
    isTrashed: false,
  })
    .select("_id name userId size parentFolderId updatedAt starred")
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
    ({ _id, name, size, updatedAt, starred }) => ({
      id: _id,
      name,
      size,
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

  return {
    folders: formattedStarredFolders,
    files: formattedStarredFiles,
  };
}
