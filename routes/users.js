const express = require("express");

const {
    loginUser,
    signupUser,
    getUserDetails,
    updateUserDetails,
    saveBookProgress,
    getBookProgress,
    startedBooksProgress,
    removeBookProgress,
    refreshToken,
} = require("../controllers/userController");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.post("/login", loginUser);

router.get("/refresh-token", requireAuth, refreshToken);

router.post("/signup", signupUser);

router.get("/details/:userId", getUserDetails);

router.post("/details/:userId", requireAuth, updateUserDetails);

router.post("/bookProgress", requireAuth, saveBookProgress);

router.get("/bookProgress/:userId/:bookId", getBookProgress);

router.get("/startedBooks/:userId", startedBooksProgress);

router.get("/removeBookProgress", removeBookProgress);

module.exports = router;
