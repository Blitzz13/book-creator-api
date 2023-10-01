const Note = require("../models/noteModel");
const { UserRole } = require("../enums/UserRole");
const mongoose = require("mongoose");

const getNotes = async (req, res) => {
  const { count, bookId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(404).json({ error: `Invalid Id {${bookId}}` });
  }

  try {
    if (!req.user) {
      return res.status(200).json([]);
    }

    const notes = await Note.find({ bookId: bookId, authorId: req.user._id }).sort({ orderId: 1 }).limit(count);

    if (!notes) {
      return res.status(404).json({ error: "Notes not found" });
    }

    return res.status(200).json(notes);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getSpecificNote = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: `Invalid Id {${id}}` });
  }

  try {
    const proceed = await canProceed(req.user._id, id);

    if (!proceed && req.user.role !== UserRole.Admin) {
      return res.status(401).json({ error: "This user is not eligible to this action" });
    }

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    return res.status(200).json(note);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getNotesByCriteria = async (req, res) => {
  const { bookId, noteName, noteId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    return res.status(404).json({ error: `Invalid Id {${id}}` });
  }

  const query = {
    $and: [{ name: { $regex: noteName, $options: "i" } }, { bookId: bookId }],
  };

  if (noteId) {
    query.$and.push({ _id: noteId });
  }

  try {
    const notes = await Note.find(query);
    if (!notes) {
      return res.status(404).json({ error: "Note not found" });
    }

    return res.status(200).json(notes);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const createNote = async (req, res) => {
  const { header, content, bookId, chapterId, orderId } = req.body;

  try {    
    const note = await Note.create({
      header,
      content,
      bookId,
      authorId: req.user._id,
      chapterId,
      orderId,
    });

    return res.status(200).json(note);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// Returns the next note if there are none returns null
const deleteNote = async (req, res) => {
  const { id } = req.params;

  try {
    const proceed = await canProceed(req.user._id, id);

    if (!proceed && req.user.role !== UserRole.Admin) {
      return res.status(401).json({ error: "This user is not eligible to this action" });
    }

    const deletedNote = await Note.findByIdAndDelete(id);

    return res.status(200).json(deletedNote);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const updateNote = async (req, res) => {
  const { id } = req.params;
  const { header, content } = req.body;

  try {
    const proceed = await canProceed(req.user._id, id);

    if (!proceed && req.user.role !== UserRole.Admin) {
      return res.status(401).json({ error: "This user is not eligible to this action" });
    }
    const note = await Note.findOneAndUpdate(
      { _id: id },
      {
        header: header,
        content: content,
      }
    );

    return res.status(200).json(note);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getAllNoteTitles = async (req, res) => {
  const { bookId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(404).json({ error: `Invalid Id {${bookId}}` });
  }

  try {
    if (!req.user) {
      return res.status(200).json([]);
    }

    const notes = await Note.find({ bookId, authorId: req.user._id });

    return res.status(200).json(
      notes.map((x) => ({
        _id: x._id,
        header: x.header,
        chapterId: x.chapterId,
        orderId: x.orderId,
      }))
    );
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

async function canProceed(userId, noteId) {
  const note = await Note.findById(noteId).select("authorId");

  if (note.authorId.toString() !== userId.toString()) {
    return false;
  }

  return true;
}

module.exports = {
  getNotes,
  getSpecificNote,
  createNote,
  updateNote,
  deleteNote,
  getNotesByCriteria,
  getAllNoteTitles,
};
