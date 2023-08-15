const Book = require("../models/bookModel");
const User = require("../models/userModel");
const Chapter = require("../models/chapterModel");
const mongoose = require("mongoose");
const { BookGenre } = require("../enums/BookGenre");

// get all books
const getBooks = async (req, res) => {
  try {
    const books = await Book.find({}).sort({ createdAt: -1 });
    return res.status(200).json(books);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// get search books count
const returnSearchBooksCount = async (req, res) => {
  const { title, authorName, genre, searchString } = req.body;

  try {
    const filter = getSearchBookFilter(title, authorName, searchString, genre);
    const books = await Book.find(filter);
    return res.status(200).json({ booksCount: books.length });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// search books
const searchBooks = async (req, res) => {
  const { title, authorName, searchString, userId, genre, skip, take } = req.body;

  try {
    const filter = getSearchBookFilter(title, authorName, searchString, genre, userId);

    const books = await Book.find(filter)
      .skip(skip)
      .limit(take)
      .sort({ createdAt: -1 });
    return res.status(200).json(books);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const addToFavourites = async (req, res) => {
  const { userId, bookId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(404).json({ error: "Invalid user id" });
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(404).json({ error: "Invalid book id" });
  }

  try {
    const user = await User.findById(userId);

    if (!user.favouriteBooks.includes(bookId)) {
      user.favouriteBooks.push(bookId);
    } else {
      const index = user.favouriteBooks.indexOf(bookId);
      user.favouriteBooks.splice(index, 1);
    }

    user.save();

    return res.status(200).json("OK");
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getFavouriteBooksIds = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid user id" });
  }

  try {
    const user = await User.findById(id);

    return res.status(200).json({ favouriteBookIds: user.favouriteBooks });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getFavouriteBooks = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid user id" });
  }

  try {
    const user = await User.findById(id).populate("favouriteBooks");

    return res.status(200).json(user.favouriteBooks);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// get 1 book
const getBook = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid Id" });
  }

  try {
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    return res.status(200).json(book);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// create book
const createBook = async (req, res) => {
  const {
    coverImage,
    genre,
    title,
    authorId,
    backCoverImage,
    state,
    rating,
    description,
  } = req.body;

  try {
    const user = await User.findById(authorId);
    if (mongoose.isValidObjectId({ _id: authorId }) || !user) {
      throw new Error(`Invalid author id ${authorId}`);
    }

    const book = await Book.create({
      coverImage,
      genre,
      title,
      author: user.displayName,
      authorId,
      backCoverImage,
      state,
      rating,
      description,
    });

    user.books.push(book._id);
    await user.save();

    return res.status(200).json(book);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// delete book
const deleteBook = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid Id" });
  }

  try {
    const book = await Book.findOneAndDelete({ _id: id });
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const user = await User.findById({ _id: book.authorId });
    await Chapter.deleteMany({ bookId: book.id });
    user.books.splice(user.books.indexOf(book._id), 1);

    await user.save();

    return res.status(200).json(book);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// update book
const updateBook = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid Id" });
  }

  try {
    const { genre } = req.body;
    const realEnums = Object.values(BookGenre);
    const updatedGenres = [];

    for (const item of genre) {
      if (!realEnums.includes(item)) {
        console.log("Unrecognized genre =>", item);
        continue;
      }

      updatedGenres.push(item);
    }

    const book = await Book.findOneAndUpdate(
      { _id: id },
      {
        ...req.body,
        genre: updatedGenres,
      }
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    return res.status(200).json(book);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

function getSearchBookFilter(title, authorName, searchString, genre, userId) {
  let filter = {};

  if (userId) {
    filter.authorId = userId;
  } else if (!title && !authorName && !genre && searchString) {
    filter = {
      $or: [
        { title: { $regex: searchString, $options: "i" } },
        { author: { $regex: searchString, $options: "i" } },
        {
          $expr: {
            $gt: [
              { $size: { $filter: { input: "$genre", cond: { $regexMatch: { input: "$$this", regex: searchString, options: "i" } } } } },
              0
            ]
          }
        },
      ],
    };
  } else {
    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }

    if (authorName) {
      filter.author = { $regex: authorName, $options: "i" };
    }

    if (genre) {
      const genreArray = Array.isArray(genre) ? genre : [genre];
      filter.genre = { $in: genreArray };
    }
  }

  return filter;
}

module.exports = {
  getBooks,
  getBook,
  getFavouriteBooksIds,
  getFavouriteBooks,
  returnSearchBooksCount,
  searchBooks,
  createBook,
  deleteBook,
  updateBook,
  addToFavourites,
};
