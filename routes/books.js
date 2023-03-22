const express = require("express");

const {
    getBooks,
    getBook,
    createBook,
    deleteBook,
    updateBook
} = require("../controllers/bookController");
const router = express.Router();

router.get("/", getBooks);

router.get("/:id", getBook);

router.post("/", createBook);

router.delete("/:id", deleteBook);

router.patch("/:id", updateBook);

module.exports = router;