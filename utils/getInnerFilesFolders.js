import File from "../models/fileModel.js";
import Folder from "../models/folderModel.js";

export async function getInnerFilesFolders(folderId = null) {
  if (!folderId) {
    return {
      files: [],
      folders: [],
    };
  }

  let innerFoldersArr = await Folder.find({
    parentFolderId: folderId,
  })
    .select("_id")
    .lean();

  let innerFilesArr = await File.find({
    parentFolderId: folderId,
  })
    .select("_id")
    .lean();

  for (const innerFolder of innerFoldersArr) {
    const { files, folders } = await getInnerFilesFolders(innerFolder._id);
    innerFoldersArr = [...innerFoldersArr, ...folders];
    innerFilesArr = [...innerFilesArr, ...files];
  }
  return {
    files: innerFilesArr,
    folders: innerFoldersArr,
  };
}
