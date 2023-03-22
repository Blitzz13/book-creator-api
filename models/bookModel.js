const mongoose = require("mongoose");

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
            Header: String,
            Content: String,
        }],
    },
}, { timestamps: true });

module.exports = mongoose.model("Book", bookSchema);