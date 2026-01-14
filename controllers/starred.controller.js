import asyncHandler from "../utils/asyncHandler.js";
import * as services from "../services/starred.service.js";

// ### SERVING STARRED ITEMS
export const getStarredItems = asyncHandler(async (req, res) => {
  const { folders, files } = await services.getStarredItems({
    userId: req.user._id,
  });
  return res.status(200).json({
    status: true,
    folders,
    files,
  });
});
