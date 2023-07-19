const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const noteSchema = new Schema({
    header: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    orderId: {
        type: Number,
        required: true,
    },
    authorId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    bookId: {
        type: Schema.Types.ObjectId,
        ref: "Book",
        required: true
    },
    chapterId: {
        type: Schema.Types.ObjectId,
        ref: "Chapter",
        required: true
    },
}, { timestamps: true });

module.exports = mongoose.model("Note", noteSchema);