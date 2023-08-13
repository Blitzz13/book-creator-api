const express = require("express");

const {
    createNote,
    deleteNote,
    getNotes,
    getNotesByCriteria,
    getSpecificNote,
    updateNote,
    getAllNoteTitles
} = require("../controllers/noteController");

const requireAuth = require("../middleware/requireAuth");
const attachUser = require("../middleware/attachUser");

const router = express.Router();

router.get("/titles/:bookId", attachUser, getAllNoteTitles);

router.get("/:bookId/:count", getNotes);

router.get("/criteria/:bookId/", getNotesByCriteria);

router.get("/:id", attachUser, getSpecificNote);

router.delete("/:id", requireAuth, deleteNote);

router.patch("/:id", requireAuth, updateNote);

router.post("/", requireAuth, createNote);

module.exports = router;