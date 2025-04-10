import mongoose from "mongoose";
import connectToDB from "./db.js";

try {
  await connectToDB();
  const db = mongoose.connection.db;

  const command = "collMod";

  // user schema json validation
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
              "name field should a string with at least 3 and at most 30 characters",
          },
          email: {
            bsonType: "string",
            description: "please enter a valid email",
            pattern: "^[^s@]+@[^s@]+.[^s@]+$",
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

  // folder schema json validation
  await db.command({
    [command]: "folders",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["_id", "name", "userId", "parentFolderId"],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
            minLength: 1,
            maxLength: 30,
            description:
              "name field should a string with at least 1 and at most 30 characters",
          },
          userId: {
            bsonType: "objectId",
          },
          parentFolderId: {
            bsonType: ["objectId", "null"],
          },
          starred: {
            bsonType: "bool",
          },
          isTrashed: {
            bsonType: "bool",
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

  // file schema json validation
  await db.command({
    [command]: "files",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["_id", "name", "size", "userId", "parentFolderId"],
        properties: {
          _id: {
            bsonType: "objectId",
          },
          name: {
            bsonType: "string",
            minLength: 1,
            maxLength: 50,
            description:
              "name field should a string with at least 1 and at most 50 characters",
          },
          size: {
            bsonType: "number",
          },
          extension: {
            bsonType: "string",
          },
          mimetype: {
            bsonType: "string",
          },
          userId: {
            bsonType: "objectId",
          },
          parentFolderId: {
            bsonType: "objectId",
          },
          starred: {
            bsonType: "bool",
          },
          isTrashed: {
            bsonType: "bool",
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
