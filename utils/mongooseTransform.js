export function mongooseTransform(doc, ret) {
  ret.id = ret._id.toString();
  if (ret.storageSize !== undefined) {
    ret.storageSize = ret.storageSize.toString();
  }
  if (ret.size !== undefined) {
    ret.size = ret.size.toString();
  }
  delete ret._id;
  delete ret.__v;
  delete ret.createdAt;
  delete ret.updatedAt;
  return ret;
}
