import mongoose from "mongoose";
import Folder from "../models/folderModel.js";
import File from "../models/fileModel.js";
import { clearAuthCookie } from "../utils/clearAuthCookies.js";
import {
  changeStarOfFolderSchema,
  createFolderSchema,
  moveFolderToTrashSchema,
  renameFolderSchema,
} from "../validators/folderSchema.js";
import { z } from "zod/v4";

// ### SERVING FOLDER CONTENT
export async function getFolder(req, res, next) {
  try {
    const folderId = req.params.folderId || req.user.rootFolderId;
    if (!mongoose.isValidObjectId(folderId)) {
      return res
        .status(400)
        .json({ status: false, errors: { message: "Invalid Folder Id" } });
    }

    // 1. First, check if the folder exists, is owned by the user, and is not trashed.
    const folder = await Folder.findOne({
      _id: folderId,
      userId: req.user._id,
      isTrashed: false,
    })
      .select("_id")
      .lean();

    if (!folder) {
      // This will catch: non-existent folders, folders not owned by the user, or trashed folders.
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: { message: "You don't have access to this resource" },
      });
    }

    // 2. Fetch nested folders and files in parallel since they don't depend on each other.
    const [nestedFolders, nestedFiles] = await Promise.all([
      Folder.find({
        userId: req.user._id,
        parentFolderId: folderId,
        isTrashed: false,
      })
        .select("name starred updatedAt")
        .lean(),
      File.find({
        userId: req.user._id,
        parentFolderId: folderId,
        isTrashed: false,
      })
        .select("name extension size starred updatedAt")
        .lean(),
    ]);

    // 3. Format the results for the client. This logic remains the same.
    const formattedNestedFolders = nestedFolders.map(
      ({ _id, name, starred, updatedAt }) => ({
        id: _id,
        name,
        owner: "me",
        starred,
        lastModified: updatedAt,
      })
    );

    const formattedNestedFiles = nestedFiles.map(
      ({ _id, name, extension, size, starred, updatedAt }) => ({
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
      data: { folders: formattedNestedFolders, files: formattedNestedFiles },
    });
  } catch (error) {
    next(error);
  }
}

// ### CREATING NEW FOLDER
export async function createFolder(req, res, next) {
  try {
    console.log(req.body);
    const { success, data, error } = createFolderSchema.safeParse({
      body: req.body,
    });

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }
    console.log(data.body);
    const { name, parentFolderId: reqParentFolderId } = data.body;
    const parentFolderId = reqParentFolderId || req.user.rootFolderId;

    // 1. CRUCIAL: Verify the user owns the parent folder
    const parentFolder = await Folder.findOne({
      _id: parentFolderId,
      userId: req.user._id,
    })
      .select("_id")
      .lean();

    if (!parentFolder) {
      return res.status(403).json({
        status: false,
        errors: { message: "You don't have access to the parent folder." },
      });
    }

    const newFolder = await Folder.create({
      name,
      userId: req.user._id,
      parentFolderId,
    });

    return res.status(201).json({
      status: true,
      message: "New folder created successfully.",
      data: { id: newFolder._id },
    });
  } catch (error) {
    next(error);
  }
}

// ### RENAMING FOLDER
export async function renameFolder(req, res, next) {
  try {
    const { success, data, error } = renameFolderSchema.safeParse({
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
    const { folderId } = data.params;

    // 1. Combine all input validations at the top.
    const trimmedName = name?.trim();
    if (!trimmedName || trimmedName.length > 30) {
      return res.status(400).json({
        status: false,
        errors: { message: "Folder name must be between 1 and 30 characters." },
      });
    }

    if (!mongoose.isValidObjectId(folderId)) {
      return res.status(400).json({
        status: false,
        errors: { message: "Invalid Folder ID" },
      });
    }

    // 2. Perform the authorization check AND the update in a single atomic operation.
    const updatedFolder = await Folder.findOneAndUpdate(
      {
        _id: folderId,
        userId: req.user._id,
      },
      {
        $set: { name: trimmedName },
      },
      {
        new: false,
      }
    );

    // 3. If nothing was updated, it means the user didn't have permission or the folder didn't exist.
    if (!updatedFolder) {
      clearAuthCookie(req, res, "token");
      return res.status(403).json({
        status: false,
        errors: {
          message: "You don't have access to this folder or it does not exist.",
        },
      });
    }

    return res
      .status(200)
      .json({ status: true, message: "Folder renamed successfully." });
  } catch (error) {
    next(error);
  }
}

// ### MOVE FOLDER TO TRASH
export async function moveFolderToTrash(req, res, next) {
  const { success, data, error } = moveFolderToTrashSchema.safeParse({
    params: req.params,
  });

  if (!success) {
    return res.status(400).json({
      status: false,
      errors: z.flattenError(error).fieldErrors,
    });
  }
  const { folderId } = data.params;
  // 1. A single session for all operations
  const session = await mongoose.startSession();

  try {
    let allFolderIds = [];
    let allFileIds = [];

    // Start the transaction
    await session.withTransaction(async () => {
      // 2. Use an aggregation to find all descendant folders in ONE database call
      const aggregationResult = await Folder.aggregate([
        // Stage 1: Match the top-level folder, ensuring ownership and that it's not already trashed.
        {
          $match: {
            _id: new mongoose.Types.ObjectId(folderId),
            userId: req.user._id,
            isTrashed: false,
          },
        },
        // Stage 2: Traverse the folder hierarchy to find all nested folders.
        {
          $graphLookup: {
            from: "folders",
            startWith: "$_id",
            connectFromField: "_id",
            connectToField: "parentFolderId",
            as: "descendants",
          },
        },
        // Stage 3: Project just the IDs we need.
        {
          $project: {
            _id: 1,
            descendantIds: "$descendants._id",
          },
        },
      ]).session(session);

      // If the aggregation returns nothing, the folder doesn't exist, isn't owned, or is already trashed.
      if (aggregationResult.length === 0) {
        clearAuthCookie(req, res, "token");
        // We throw an error to automatically abort the transaction.
        const err = new Error(
          "Folder not found, is already trashed, or access is denied."
        );
        err.statusCode = 403;
        throw err;
      }

      const { _id: rootFolderId, descendantIds } = aggregationResult[0];
      allFolderIds = [rootFolderId, ...descendantIds];

      // 3. Find all files within the entire folder tree in ONE database call
      const filesToTrash = await File.find({
        parentFolderId: { $in: allFolderIds },
      })
        .select("_id")
        .session(session)
        .lean();

      allFileIds = filesToTrash.map((file) => file._id);

      // 4. Update all folders and files
      if (allFolderIds.length > 0) {
        await Folder.updateMany(
          { _id: { $in: allFolderIds } },
          { $set: { isTrashed: true } },
          { session }
        );
      }
      if (allFileIds.length > 0) {
        await File.updateMany(
          { _id: { $in: allFileIds } },
          { $set: { isTrashed: true } },
          { session }
        );
      }
    }); // The transaction is automatically committed here if no errors were thrown

    return res.status(200).json({
      status: true,
      message: "Folder and its contents moved to trash.",
    });
  } catch (error) {
    // If the error has a statusCode we set, use it. Otherwise, pass to the default error handler.
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({ status: false, errors: { message: error.message } });
    }
    next(error);
  } finally {
    await session.endSession();
  }
}

// ### ADD OR REMOVE STAR FROM A FOLDER
export async function changeStarOfFolder(req, res, next) {
  try {
    const { success, data, error } = changeStarOfFolderSchema.safeParse({
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
    const { folderId } = data.params;

    if (!(typeof isStarred === "boolean")) {
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
        errors: {
          message: "You don't have access to this Folder or it does not exist.",
        },
      });
    }

    await Folder.findByIdAndUpdate(foundFolder._id, { starred: isStarred });
    return res.status(200).json({
      status: true,
      message: isStarred
        ? "Folder is added to Starred"
        : "Folder is removed from Starred",
    });
  } catch (error) {
    next(error);
  }
}
