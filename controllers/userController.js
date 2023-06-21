const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const createToken = (id) => {
  return jwt.sign({ _id: id }, process.env.SECRET, { expiresIn: "3d" });
};

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

module.exports = { loginUser, signupUser };
