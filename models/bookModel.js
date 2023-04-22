const mongoose = require("mongoose");
const { BookState } = require("../enums/BookState");

const Schema = mongoose.Schema;

const bookSchema = new Schema(
  {
    coverImage: {
      type: String,
      required: true,
    },
    backCoverImage: {
      type: String,
    },
    genre: {
      type: [String],
    },
    description: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      enum: Object.values(BookState),
      default: BookState.Draft,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
    },
    chapters: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Chapter",
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
