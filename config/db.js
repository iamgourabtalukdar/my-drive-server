import mongoose from "mongoose";

async function connectToDB() {
  const dbURL = process.env.DB_URI;
  try {
    await mongoose.connect(dbURL);
    console.log("DB Connected");
  } catch (error) {
    console.log("Error", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("DB disconnected");
  process.exit(0);
});

export default connectToDB;
