const express = require("express");

const {
    createRating,
    updateRating,
    deleteRating,
    getAverageRatingForBook,
    getAverageRatingForMultipleBooks,
    getAllUserRatings,
    getUserRatingOfBook,
} = require("../controllers/ratingsController");

const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.get("/average/:bookId", getAverageRatingForBook);

router.get("/user/:userId", getAllUserRatings);

router.get("/user/:userId/:bookId", getUserRatingOfBook);

router.post("/average", getAverageRatingForMultipleBooks);

router.post("/rate/:bookId", requireAuth, createRating);

router.patch("/rate/:ratingId", requireAuth, updateRating);

router.delete("/rate/:ratingId", requireAuth, deleteRating);

module.exports = router;