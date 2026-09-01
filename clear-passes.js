const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env.local") });

async function clear() {
    const uri = process.env.DB;
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const result = await mongoose.connection.db.collection("passes").deleteMany({});
    console.log("Deleted passes:", result.deletedCount);

    process.exit(0);
}

clear().catch(console.error);
