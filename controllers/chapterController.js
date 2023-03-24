const Chapter = require("../models/chapterModel");
const mongoose = require("mongoose");

const getChapters = async (req, res) => {
    const { count, bookId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(404).json({ error: `Invalid Id {${bookId}}` });
    }

    try {
        const chapters = await Chapter.find({ bookId }).sort({ orderId: 1 }).limit(count);

        if (!chapters) {
            return res.status(404).json({ error: "Chapters not found" });
        }

        return res.status(200).json(chapters);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

const getSpecificChapter = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: `Invalid Id {${id}}` });
    }

    try {
        const chapter = await Chapter.findById(id);

        if (!chapter) {
            return res.status(404).json({ error: "Chapter not found" });
        }

        return res.status(200).json(chapter);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

const createChapter = async (req, res) => {
    const { header, content, bookId, orderId } = req.body;

    try {
        const chapter = await Chapter.create({
            header,
            content,
            bookId,
            orderId
        });
        return res.status(200).json(chapter);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

const updateChapter = async (req, res) => {
    const { id } = req.params;

    try {
        const chapter = await Chapter.findOneAndUpdate({ _id: id }, {
            ...req.body
        });

        return res.status(200).json(chapter);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getChapters,
    getSpecificChapter,
    createChapter,
    updateChapter
}