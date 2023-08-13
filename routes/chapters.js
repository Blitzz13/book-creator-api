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

const requireAuth = require("../middleware/requireAuth");
const router = express.Router();

router.get("/:bookId/:count", getChapters);

router.get("/chapter/chapter-titles/:bookId", getAllChapterTitles);

router.get("/:id", getSpecificChapter);

router.delete("/:id", requireAuth, deleteChapter);

router.patch("/:id", requireAuth, updateChapter);

router.post("/update-order", requireAuth, updateChaptersOrder);

router.post("/by-criteria", getChapterByCriteria);

router.post("/", requireAuth, createChapter);

module.exports = router;