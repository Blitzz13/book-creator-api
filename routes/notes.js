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
const router = express.Router();

router.get("/titles/:bookId", getAllNoteTitles);

router.get("/:bookId/:count", getNotes);

router.get("/criteria/:bookId/", getNotesByCriteria);

router.get("/:id", getSpecificNote);

router.delete("/:id", deleteNote);

router.patch("/:id", updateNote);

router.post("/", createNote);

module.exports = router;