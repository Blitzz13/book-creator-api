const express = require("express");

const {
  getBooks,
  getBook,
  createBook,
  deleteBook,
  updateBook,
  returnSearchBooksCount,
  searchBooks,
  addToFavourites,
  getFavouriteBooksIds,
  getFavouriteBooks,
} = require("../controllers/bookController");
const attachUser = require("../middleware/attachUser");
const requireAuth = require("../middleware/requireAuth");
const router = express.Router();

router.get("/", getBooks);

router.get("/:id", getBook);

router.get("/favourites-ids/:id", attachUser, getFavouriteBooksIds);

router.get("/favourites/:id", attachUser, getFavouriteBooks);

router.post("/", requireAuth, createBook);

router.post("/search", attachUser, searchBooks);

router.post("/search/count", attachUser, returnSearchBooksCount);

router.post("/favourites", requireAuth, addToFavourites);

router.delete("/:id", requireAuth, deleteBook);

router.patch("/:id", requireAuth, updateBook);

module.exports = router;
