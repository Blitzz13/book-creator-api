const mongoose = require("mongoose");
const ChapterState = require("../enums/ChapterState");

const Schema = mongoose.Schema;

const chapterSchema = new Schema({
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
    bookId: {
        type: Schema.Types.ObjectId,
        ref: "Book",
        required: true
    },
    state: {
        type: String,
        enum: Object.values(ChapterState),
        default: ChapterState.Draft,
        required: true,
      },
}, { timestamps: true });

module.exports = mongoose.model("Chapter", chapterSchema);