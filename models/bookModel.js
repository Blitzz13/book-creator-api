const mongoose = require("mongoose");
const chapterModel = require("../models/chapterModel");

const Schema = mongoose.Schema;

const bookSchema = new Schema({
    coverImage: {
        type: String,
        required: true,
    },
    genre: {
        type: [String]
    },
    title: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
    },
    chapters: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chapter",
        }],
    },
}, { timestamps: true });

module.exports = mongoose.model("Book", bookSchema);