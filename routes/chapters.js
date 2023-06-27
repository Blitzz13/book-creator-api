const express = require("express");

const {
    getChapters,
    createChapter,
    getSpecificChapter,
    updateChapter,
    getAllChapterTitles,
    updateChaptersOrder,
    deleteChapter,
    getChapterByCriteria
} = require("../controllers/chapterController");
const router = express.Router();

router.get("/:bookId/:count", getChapters);

router.get("/chapter/chapter-titles/:bookId", getAllChapterTitles);

router.get("/:id", getSpecificChapter);

router.delete("/:id", deleteChapter);

router.patch("/:id", updateChapter);

router.post("/update-order", updateChaptersOrder);

router.post("/by-criteria", getChapterByCriteria);

router.post("/", createChapter);

module.exports = router;