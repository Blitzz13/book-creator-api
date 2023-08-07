const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");

const RoleImport = require("../enums/UserRole");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    imageUrl: {
      type: String,
    },
    description: {
      type: String,
    },
    displayName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(RoleImport.UserRole),
      default: RoleImport.UserRole.User,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    books: [
      {
        type: Schema.Types.ObjectId,
        ref: "Book",
      },
    ],
    favouriteBooks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Book",
      },
    ],
    settings: {
      hideFavouriteBooks: { type: Boolean, default: false },
      hideEmail: { type: Boolean, default: true },
    }
  },
  { timestamps: true }
);

userSchema.statics.signup = async function (email, password, displayName) {
  const exists = await this.findOne({ email });
  if (!email || !password || !displayName) {
    throw new Error("All properties are required");
  }

  if (!validator.isEmail(email)) {
    throw new Error("Not a valid email");
  }

  if (!validator.isStrongPassword(password)) {
    throw new Error("Not a strong password");
  }

  if (exists) {
    throw new Error("Email already in use");
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const user = await this.create({ email, password: hash, displayName });

  return user;
};

userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });

  if (!email || !password) {
    throw new Error("All properties are required");
  }

  if (!user) {
    throw new Error("Invalid login credentials");
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw new Error("Invalid login credentials");
  }

  return user;
};

module.exports = mongoose.model("User", userSchema);
