require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB connection error:", err));

const users = [
{ name: "Admin", email: "admin@example.com", password: "AdminPass123!", role: "admin" },
{ name: "Agent", email: "agent@example.com", password: "AgentPass123!", role: "agent" },
{ name: "User", email: "user@example.com", password: "UserPass123!", role: "user" }
];

async function seed() {
for (const u of users) {
const existing = await User.findOne({ email: u.email });
if (!existing) {
const user = new User(u);
await user.save();
console.log(`Created user: ${u.email}`);
} else {
console.log(`User already exists: ${u.email}`);
}
}
mongoose.disconnect();
}

seed();