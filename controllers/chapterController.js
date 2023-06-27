const Chapter = require("../models/chapterModel");
const mongoose = require("mongoose");

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
    const chapters = await Chapter.find({ bookId }).sort({ orderId: 1 });

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
    const chapter = await Chapter.findById(id);

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
    const greatestOrderId = await Chapter.findOne(
      { bookId: bookId },
      { orderId: 1 }
    )
      .sort({ orderId: -1 })
      .limit(1);

    let correctOrderId = orderId;
    if (greatestOrderId && (orderId < 1 || orderId > greatestOrderId.orderId + 1)) {
      correctOrderId = greatestOrderId.orderId + 1;
    } else {
      correctOrderId = 1;
    }

    const chapter = await Chapter.create({
      header,
      content,
      bookId,
      orderId: correctOrderId,
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
    const deletedChapter = await Chapter.findByIdAndDelete(id);

    const hasChapter = await Chapter.findOne({ bookId: deletedChapter.bookId });

    if (hasChapter) {
      const greatestOrderId = await Chapter.findOne(
        { bookId: deletedChapter.bookId },
        { orderId: 1 }
      )
        .sort({ orderId: -1 })
        .limit(1);

      let chapterToGet;

      //If it is the last element no reordering needed
      if (deletedChapter.orderId > greatestOrderId.orderId) {
        chapterToGet = await Chapter.findOne({
          bookId: deletedChapter.bookId,
          orderId: deletedChapter.orderId - 1,
        });
      } else {
        await Chapter.find({ orderId: { $gt: deletedChapter.orderId } })
          .exec()
          .then((chapters) => {
            // Retrieve documents with orderId greater than value
            console.log(chapters);

            // Decrement orderId by one for each document
            const updatedDocuments = chapters.map((chapter) => {
              return Chapter.findByIdAndUpdate(
                chapter._id,
                { $inc: { orderId: -1 } },
                { new: true }
              );
            });

            // Execute all the update operations
            return Promise.all(updatedDocuments);
          })
          .then((updatedDocuments) => {
            console.log("Documents updated successfully");
          })
          .catch((error) => {
            console.error("Error updating documents:", error);
          });

        chapterToGet = await Chapter.findOne({
          bookId: deletedChapter.bookId,
          orderId: deletedChapter.orderId,
        });

        // await updateOrder(chapterToGet._id, deletedChapter.orderId);
      }

      return res.status(200).json(chapterToGet);
    }

    return res.status(200).json(null);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const updateChapter = async (req, res) => {
  const { id } = req.params;
  const { orderId } = req.body;

  try {
    if (orderId) {
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

  if (newOrderId !== currentOrderId) {
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
