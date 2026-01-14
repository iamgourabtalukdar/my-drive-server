import * as services from "../services/trash.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// ### SERVING TRASH CONTENT
export const getTrashContent = asyncHandler(async (req, res) => {
  const { folders, files } = await services.getTrashContent({
    userId: req.user._id,
  });
  return res.status(200).json({
    status: true,
    folders,
    files,
  });
});

// ### EMPTYING THE ALL TRASH ITEMS
export const emptyTrash = asyncHandler(async (req, res) => {
  await services.emptyTrash({
    userId: req.user._id,
  });
  return res.status(200).json({
    status: true,
    message: "Trash emptied successfully",
  });
});
