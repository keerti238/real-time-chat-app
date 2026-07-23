const mongoose = require("mongoose");

const uri =
  "mongodb+srv://chatappuser:YOUR_NEW_PASSWORD@cluster0.8dzbf0i.mongodb.net/realtime_chat?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(uri)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Connection Failed");
    console.error(err);
    process.exit(1);
  });