import mongoose from "mongoose";

async function connectToDB() {
  const dbURL = "mongodb://localhost:27017/driveApp";
  try {
    await mongoose.connect(dbURL);
    console.log("DB connected");
  } catch (err) {
    console.log("Error while connecting with DB", err);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("DB disconnected");
  process.exit(0);
});

export default connectToDB;
