const express = require("express");

const {
    loginUser,
    signupUser,
    getUserDetails,
    updateUserDetails,
} = require("../controllers/userController");

const router = express.Router();

router.post("/login", loginUser);

router.post("/signup", signupUser);

router.get("/details/:userId", getUserDetails);

router.post("/details/:userId", updateUserDetails);

module.exports = router;
