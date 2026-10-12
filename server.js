// server.js: starts the Express server, connects to MongoDB,
// and defines the four REST routes for users.
const path = require("path");

// Load environment variables from config/.env (not the project root),
// because the checkpoint asks for the .env file inside the config folder.
require("dotenv").config({
  path: path.join(__dirname, "config", ".env"),
  quiet: true,
});

const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware: lets Express read JSON request bodies (req.body).
app.use(express.json());

// Turns a Mongoose/MongoDB error into the right HTTP status and message.
function sendError(res, error) {
  // Invalid id format, e.g. /users/123 instead of a 24-character ObjectId.
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid user id" });
  }

  // Schema rules broken, e.g. missing name or a badly formatted email.
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({ message: "Validation failed", errors: messages });
  }

  // Duplicate key: another user already has this email (unique: true).
  if (error.code === 11000) {
    return res.status(409).json({ message: "Email already in use" });
  }

  // Anything else is an unexpected server problem.
  console.error(error);
  return res.status(500).json({ message: "Server error" });
}

// GET /users -> return all users.
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    sendError(res, error);
  }
});

// POST /users -> add a new user using the JSON body.
app.post("/users", async (req, res) => {
  try {
    const { name, email, age } = req.body;
    const newUser = await User.create({ name, email, age });
    res.status(201).json(newUser);
  } catch (error) {
    sendError(res, error);
  }
});

// PUT /users/:id -> edit a user by id.
app.put("/users/:id", async (req, res) => {
  try {
    const { name, email, age } = req.body || {};

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, age },
      {
        new: true,           // return the user AFTER the update
        runValidators: true, // apply the schema rules to the new values too
      }
    );

    // findByIdAndUpdate returns null when no user has this id.
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    sendError(res, error);
  }
});

// DELETE /users/:id -> remove a user by id.
app.delete("/users/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted", user: deletedUser });
  } catch (error) {
    sendError(res, error);
  }
});

// Any other URL -> 404.
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Connect to MongoDB first, then start the server.
// If the connection fails there's no point running the API, so we exit.
async function startServer() {
  if (!MONGO_URI) {
    console.error("MONGO_URI is missing. Check config/.env");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Could not connect to MongoDB:", error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other server first.`);
    } else {
      console.error("Server error:", error.message);
    }
    process.exit(1);
  });
}

startServer();