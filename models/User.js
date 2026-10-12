// User model: defines what a "user" document looks like in MongoDB.
const mongoose = require("mongoose");

// The schema lists each field, its type, and its validation rules.
const userSchema = new mongoose.Schema(
  {
    // name: required text, extra spaces removed.
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    // email: required, stored in lowercase, must look like an email,
    // and must be unique (no two users can share one).
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email is not valid"],
    },

    // age: optional whole number between 0 and 120.
    age: {
      type: Number,
      min: [0, "Age cannot be negative"],
      max: [120, "Age looks too high"],
    },
  },
  {
    // timestamps adds createdAt and updatedAt automatically.
    timestamps: true,
  }
);

// Create the model and export it so server.js can use it.
// MongoDB stores these documents in a collection called "users".
const User = mongoose.model("User", userSchema);

module.exports = User;