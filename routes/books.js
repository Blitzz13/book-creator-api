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
const router = express.Router();

router.get("/", getBooks);

router.get("/:id", getBook);

router.get("/favourites-ids/:id", getFavouriteBooksIds);

router.get("/favourites/:id", getFavouriteBooks);

router.post("/", createBook);

router.post("/search", searchBooks);

router.post("/search/count", returnSearchBooksCount);

router.post("/favourites", addToFavourites);

router.delete("/:id", deleteBook);

router.patch("/:id", updateBook);

module.exports = router;
