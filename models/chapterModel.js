const mongoose = require("mongoose");

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
    }
}, { timestamps: true });

module.exports = mongoose.model("Chapter", chapterSchema);