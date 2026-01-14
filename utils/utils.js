import mongoose from "mongoose";
import File from "../models/File.model.js";
import Folder from "../models/Folder.model.js";

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
    .select("_id s3Key size")
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

export async function updateFolderSize(folderId, deltaSize, session) {
  if (typeof deltaSize !== "number" || isNaN(deltaSize) || deltaSize === 0) {
    console.error("Invalid deltaSize provided:", deltaSize);
    return;
  }

  try {
    const startFolderId = new mongoose.Types.ObjectId(folderId);

    // --- Find all ancestor IDs ---
    const aggregationResult = await Folder.aggregate([
      {
        $match: { _id: startFolderId },
      },
      {
        // 2. Recursively find all parents up to the root
        $graphLookup: {
          from: "folders",
          startWith: "$parentFolderId",
          connectFromField: "parentFolderId",
          connectToField: "_id",
          as: "ancestors",
        },
      },
      {
        // 3. Project only the IDs of the ancestors
        $project: {
          ancestorIds: "$ancestors._id",
        },
      },
    ]);

    if (!aggregationResult || aggregationResult.length === 0) {
      console.warn(`Folder not found for size update: ${folderId}`);
      return;
    }

    // Collect all IDs to be updated:
    // The folder itself + all its ancestor IDs
    const allFolderIdsToUpdate = [
      startFolderId,
      ...aggregationResult[0].ancestorIds,
    ];

    // --- Update all folders in one command ---
    await Folder.updateMany(
      { _id: { $in: allFolderIdsToUpdate } },
      { $inc: { size: BigInt(deltaSize) } },
      { session }
    );
  } catch (error) {
    console.error("Error during minimal update of folder sizes:", error);
    throw error;
  }
}
