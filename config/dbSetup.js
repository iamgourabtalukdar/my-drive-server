import mongoose from "mongoose";
import connectToDB from "./db.js";

try {
  await connectToDB();
  const db = mongoose.connection.db;

  const command = "collMod";

  await db.command({
    [command]: "users",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["_id", "name", "email", "password", "rootFolderId"],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
            minLength: 3,
            maxLength: 30,
            description:
              "name field should a string with at least 3 characters",
          },
          email: {
            bsonType: "string",
            description: "please enter a valid email",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          },
          password: {
            bsonType: "string",
            minLength: 4,
          },
          rootFolderId: {
            bsonType: "objectId",
          },
          createdAt: {
            bsonType: "date",
          },
          updatedAt: {
            bsonType: "date",
          },
          __v: {
            bsonType: "int",
          },
        },
        additionalProperties: false,
      },
    },
    validationAction: "error",
    validationLevel: "strict",
  });
} catch (err) {
  console.log(err);
}
