const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env.local") });

async function check() {
    const uri = process.env.MONGODB_URI || process.env.DB;
    if (!uri) {
        console.error("DB connection string missing");
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const users = await mongoose.connection.db.collection("users").find({}).toArray();
    console.log("Users found:", users.length);
    users.forEach(u => {
        console.log(`- ${u.email} (${u.role}) PasswordHash length: ${u.passwordHash?.length || 0}`);
    });

    process.exit(0);
}

check().catch(console.error);
