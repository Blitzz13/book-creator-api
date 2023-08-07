const User = require("../models/userModel");
const Book = require("../models/bookModel");
const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");

const createToken = (id) => {
  return jwt.sign({ _id: id }, process.env.SECRET, { expiresIn: "3d" });
};

const getUserDetails = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    //TODO: dont send email if the setting is true
    res.status(200).json({
      displayName: user.displayName,
      description: user.description,
      imageUrl: user.imageUrl,
      email: user.email,
      settings: user.settings,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const updateUserDetails = async (req, res) => {
  const { userId, displayName, description, imageUrl, settings } = req.body;

  const updateFields = {
    settings: {}
  };

  if (displayName) {
    updateFields.displayName = displayName;
  }

  if (imageUrl) {
    updateFields.imageUrl = imageUrl;
  }

  if (description) {
    updateFields.description = description;
  }

  if (settings) {
    if (settings.hideFavouriteBooks !== undefined) {
      updateFields.settings.hideFavouriteBooks = settings.hideFavouriteBooks
    }

    if (settings.hideEmail !== undefined) {
      updateFields.settings.hideEmail = settings.hideEmail
    }
  }

  try {
    const user = await User.findByIdAndUpdate(userId, updateFields, { new: true });
    if (updateFields.displayName) {
      const filter = { authorId: new mongoose.Types.ObjectId(userId) };
      await Book.updateMany(filter, { author: updateFields.displayName });
    }

    res.status(200).json({
      displayName: user.displayName,
      description: user.description,
      settings: user.settings
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const displayName = user.displayName;

    const token = createToken(user._id);
    res.status(200).json({ email, token, displayName, id: user._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const signupUser = async (req, res) => {
  const { email, password, displayName } = req.body;

  try {
    const user = await User.signup(email, password, displayName);
    const token = createToken(user._id);

    res.status(200).json({ email, token, displayName, id: user._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  loginUser,
  signupUser,
  getUserDetails,
  updateUserDetails
};
