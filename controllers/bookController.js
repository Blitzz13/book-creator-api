const Book = require("../models/bookModel");
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
        const book = await Book.findById(id).sort({ createdAt: -1 });


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
    const { coverImage, genre, title, author, chapters } = req.body;

    try {
        const book = await Book.create({
            coverImage,
            genre,
            title,
            author,
            chapters
        });
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
        const book = await Book.findOneAndUpdate({ _id: id }, {
            ...req.body
        });

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
    updateBook
}