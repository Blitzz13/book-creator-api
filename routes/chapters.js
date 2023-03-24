const express = require("express");

const {
    getChapters,
    createChapter,
    getSpecificChapter,
    updateChapter
} = require("../controllers/chapterController");
const router = express.Router();

router.get("/:bookId/:count", getChapters);

router.get("/:id", getSpecificChapter);

router.patch("/:id", updateChapter);

router.post("/", createChapter);

module.exports = router;