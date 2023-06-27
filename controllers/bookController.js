const Book = require("../models/bookModel");
const User = require("../models/userModel");
const Chapter = require("../models/chapterModel");
const mongoose = require("mongoose");

// get all books
const getBooks = async (req, res) => {
  try {
    const books = await Book.find({}).sort({ createdAt: -1 });
    return res.status(200).json(books);
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
    const book = await Book.findOneAndUpdate(
      { _id: id },
      {
        ...req.body,
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

module.exports = {
  getBooks,
  getBook,
  createBook,
  deleteBook,
  updateBook,
};
