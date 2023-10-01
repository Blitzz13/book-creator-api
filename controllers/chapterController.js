const Chapter = require("../models/chapterModel");
const Book = require("../models/bookModel");
const { UserRole } = require("../enums/UserRole");
const mongoose = require("mongoose");
const { ChapterState } = require("../enums/ChapterState");
const getChapters = async (req, res) => {
  const { count, bookId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(404).json({ error: `Invalid Id {${bookId}}` });
  }

  try {
    const chapters = await Chapter.find({ bookId })
      .sort({ orderId: 1 })
      .limit(count);

    if (!chapters) {
      return res.status(404).json({ error: "Chapters not found" });
    }

    return res.status(200).json(chapters);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const updateChaptersOrder = async (req, res) => {
  try {
    const { orderId, chapterId } = req.body;

    const proceed = await canProceed(req.user._id, chapterId);

    if (!proceed) {
      return res
        .status(401)
        .json({ error: "This user is not eligible to this action" });
    }

    await updateOrder(chapterId, orderId);

    return res.status(200).json({ _id: chapterId, orderId: orderId });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getAllChapterTitles = async (req, res) => {
  const { bookId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(404).json({ error: `Invalid Id {${bookId}}` });
  }

  try {
    let filter = { bookId: bookId };
    if (req.user) {
      const isAuthor = await isTheAuthor(req.user._id, bookId);

      if (!isAuthor && req.user.role !== UserRole.Admin) {
        filter.state = { $in: [ChapterState.Finished, ChapterState.Public] };
      }
    } else {
      filter.state = { $in: [ChapterState.Finished, ChapterState.Public] };
    }

    const chapters = await Chapter.find(filter).sort({ orderId: 1 });

    return res.status(200).json(
      chapters.map((x) => ({
        header: x.header,
        _id: x._id,
        orderId: x.orderId,
      }))
    );
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
    let filter = { _id: id };

    if (req.user) {
      const proceed = await canProceed(req.user._id, id);

      if (!proceed && req.user.role !== UserRole.Admin) {
        filter.state = { $in: [ChapterState.Finished, ChapterState.Public] };
      }
    } else {
      filter.state = { $in: [ChapterState.Finished, ChapterState.Public] };
    }

    const chapter = await Chapter.findOne(filter);

    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    return res.status(200).json(chapter);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getChapterByCriteria = async (req, res) => {
  const { orderId, bookId, chapterId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: `Invalid Id {${id}}` });
  }

  try {
    const chapter = await Chapter.findOne({
      bookId: bookId,
      orderId: orderId,
      _id: chapterId,
    });

    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    return res.status(200).json(chapter);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const createChapter = async (req, res) => {
  const { header, content, bookId, orderId, state } = req.body;

  try {
    const proceed = await isTheAuthor(req.user._id, bookId);

    if (!proceed && req.user.role !== UserRole.Admin) {
      return res
        .status(401)
        .json({ error: "This user is not eligible to this action" });
    }

    const greatestOrderId = await Chapter.findOne(
      { bookId: bookId },
      { orderId: 1 }
    )
      .sort({ orderId: -1 })
      .limit(1);

    let correctOrderId = orderId;
    if (
      greatestOrderId &&
      (orderId < 1 || orderId > greatestOrderId.orderId + 1)
    ) {
      correctOrderId = greatestOrderId.orderId + 1;
    } else if (!greatestOrderId) {
      correctOrderId = 1;
    }

    const chapter = await Chapter.create({
      header,
      content,
      bookId,
      orderId: greatestOrderId.orderId + 1,
      state,
    });

    //update order if it is not added at the bottom of the list
    if (orderId === correctOrderId) {
      updateOrder(chapter.id, correctOrderId);
    }

    return res.status(200).json(chapter);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Returns the next chapter if there are none returns null
const deleteChapter = async (req, res) => {
  const { id } = req.body;

  try {
    const proceed = await canProceed(req.user._id, id);

    if (!proceed && req.user.role !== UserRole.Admin) {
      return res
        .status(401)
        .json({ error: "This user is not eligible to this action" });
    }

    const deletedChapter = await Chapter.findByIdAndDelete(id);

    if (!deletedChapter) {
      return res.status(200).json(null); // Chapter not found, return success with null
    }

    const { bookId, orderId } = deletedChapter;

    const greatestOrderId = await Chapter.findOne({ bookId })
      .sort({ orderId: -1 })
      .limit(1);

    let chapterToGet;

    // Check if reordering is needed
    if (orderId <= greatestOrderId.orderId) {
      // Find chapters with orderId greater than the deleted chapter
      const chaptersToDecrement = await Chapter.find({
        bookId,
        orderId: { $gt: orderId },
      });

      // Decrement orderId by one for each chapter
      for (const chapter of chaptersToDecrement) {
        chapter.orderId -= 1;
        await chapter.save();
      }

      // Get the previous chapter if it's not the last one
      if (orderId > 1) {
        chapterToGet = await Chapter.findOne({
          bookId,
          orderId: orderId - 1,
        });
      } else if (orderId === 1) {
        chapterToGet = await Chapter.findOne({
          bookId,
          orderId: 1,
        });
      }
    } else {
      chapterToGet = await Chapter.findOne({
        bookId,
        orderId: orderId - 1,
      });
    }

    return res.status(200).json(chapterToGet);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const updateChapter = async (req, res) => {
  const { id } = req.params;
  const { orderId } = req.body;

  try {
    const proceed = await canProceed(req.user._id, id);

    if (!proceed && req.user.role !== UserRole.Admin) {
      return res
        .status(401)
        .json({ error: "This user is not eligible to this action" });
    }

    const currChapter = await Chapter.findById(id).select("bookId");
    if (orderId !== currChapter.orderId) {
      await updateOrder(id, orderId);
    }

    const chapter = await Chapter.findOneAndUpdate(
      { _id: id },
      {
        ...req.body,
      }
    );

    return res.status(200).json(chapter);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

async function updateOrder(chapterId, orderId) {
  let newOrderId = orderId;

  const chapter = await Chapter.findById(chapterId);
  const currentOrderId = chapter.orderId;

  if (parseInt(newOrderId) !== currentOrderId) {
    const chaptersToUpdate = await Chapter.find({
      bookId: chapter.bookId,
      orderId: {
        $gte: Math.min(currentOrderId, newOrderId),
        $lte: Math.max(currentOrderId, newOrderId),
      },
    });

    const bulkOps = chaptersToUpdate.map((chap) => {
      const update = {
        $inc: { orderId: newOrderId > currentOrderId ? -1 : 1 },
      };
      return {
        updateOne: {
          filter: { _id: chap._id },
          update,
        },
      };
    });

    await Chapter.bulkWrite(bulkOps);
    chapter.orderId = newOrderId;
    await chapter.save();
  }
}

async function canProceed(userId, chapterId) {
  const chapter = await Chapter.findById(chapterId).select("bookId");
  const book = await Book.findById(chapter.bookId).select("authorId");

  if (book.authorId.toString() !== userId.toString()) {
    return false;
  }

  return true;
}

async function isTheAuthor(userId, bookId) {
  const book = await Book.findById(bookId).select("authorId");

  if (book.authorId.toString() !== userId.toString()) {
    return false;
  }

  return true;
}

module.exports = {
  getChapters,
  getSpecificChapter,
  getAllChapterTitles,
  createChapter,
  updateChapter,
  updateChaptersOrder,
  deleteChapter,
  getChapterByCriteria,
};
