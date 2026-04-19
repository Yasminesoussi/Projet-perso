const Admin = require("./models/Admin");
const mongoose = require("mongoose");
require("dotenv").config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected ✅"))
    .catch((err) => console.error("MongoDB connection error:", err));

const createAdmin = async () => {
    try {
        const existingAdmin = await Admin.findOne({ email: "admin@gmail.com" });
        if (existingAdmin) {
            console.log("Admin already exists ✅");
            mongoose.disconnect();
            return;
        }

        const admin = new Admin({
            fullName: "Admin Principal",
            email: "admin@gmail.com",
            password: "123456",
            role: "Super Admin",
            phone: "+21612345678",
            address: "Tunis, Tunisia",
            bio: "Administrateur principal du système"
        });

        await admin.save();
        console.log("Admin created ✅");
        mongoose.disconnect();
    } catch (error) {
        console.error("Error creating admin:", error);
        mongoose.disconnect();
    }
};

createAdmin();