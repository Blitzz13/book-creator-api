const User = require("../models/userModel");
const Book = require("../models/bookModel");
const Chapter = require("../models/chapterModel");
const { UserRole } = require("../enums/UserRole");
const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");
const { ChapterState } = require("../enums/ChapterState");

const requestQueue = [];

const createToken = (id) => {
  return jwt.sign({ _id: id }, process.env.SECRET, { expiresIn: "2d" });
};

const getUserDetails = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);

    //TODO: dont send email if the setting is true
    res.status(200).json({
      displayName: user.displayName,
      description: user.description,
      imageUrl: user.imageUrl,
      role: user.role,
      email: user.email,
      settings: user.settings,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const refreshToken = async (req, res) => {
  try {
    // Generate a new token with a refreshed expiration time
    const newToken = createToken();

    res.status(200).send({ token: newToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(400).send('Error while creating token');
  }
}

const searchUser = async (req, res) => {
  const { email, displayName } = req.body;
  let filter = {};
  try {
    if (email) {
      filter.email = { $regex: email, $options: "i" };
    }

    if (displayName) {
      filter.displayName = { $regex: displayName, $options: "i" };
    }

    const users = await User.find(filter).select("email displayName _id");

    return res.status(200).json(users.map(x => ({
      email: x.email,
      displayName: x.displayName,
      userId: x._id,
    })));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const searchUserIds = async (req, res) => {
  const { userIds } = req.body;
  try {
    const users = await User.find({ _id: { $in: userIds } }).select("email displayName _id");

    return res.status(200).json(users.map(x => ({
      email: x.email,
      displayName: x.displayName,
      userId: x._id,
    })));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const updateUserDetails = async (req, res) => {
  const { userId, displayName, description, imageUrl, role, settings } = req.body;

  const proceed = await canProceed(req.user._id, userId);

  if (!proceed && req.user.role !== UserRole.Admin) {
    return res.status(401).json({ error: "This user is not eligible to this action" });
  }

  const updateFields = {
    settings: {}
  };

  if (displayName) {
    updateFields.displayName = displayName;
  }

  if (imageUrl) {
    updateFields.imageUrl = imageUrl;
  }

  if (description) {
    updateFields.description = description;
  }

  if (role && req.user.role === UserRole.Admin) {
    updateFields.role = role;
  }

  if (settings) {
    if (settings.hideFavouriteBooks !== undefined) {
      updateFields.settings.hideFavouriteBooks = settings.hideFavouriteBooks
    }

    if (settings.hideEmail !== undefined) {
      updateFields.settings.hideEmail = settings.hideEmail
    }
  }

  try {
    const user = await User.findByIdAndUpdate(userId, updateFields, { new: true });
    if (updateFields.displayName) {
      const filter = { authorId: new mongoose.Types.ObjectId(userId) };
      await Book.updateMany(filter, { author: updateFields.displayName });
    }

    res.status(200).json({
      displayName: user.displayName,
      description: user.description,
      settings: user.settings
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const saveBookProgressHandler = async (request) => {
  const { restoreRefference, currentChapterId, chapterPercentage, bookId, userId } = request;

  try {
    const user = await User.findById(userId);
    let bookProgress = user.booksProgress.find(x => x.bookId.toString() === bookId);
    const chapter = await Chapter.findById(currentChapterId);
    const allChaptersCount = (await Chapter.find({ bookId })).length;

    if (!bookProgress) {
      bookProgress = {
        allChaptersCount: allChaptersCount,
        bookId: bookId,
        currentChapterId: currentChapterId,
        currentChapterOrderId: chapter.orderId,
        restoreRefference: restoreRefference,
        chapterPercentage: chapterPercentage,
      }

      user.booksProgress.push(bookProgress);
    } else {
      const updatedArray = []

      user.booksProgress.forEach(item => {
        if (item.bookId.toString() === bookId) {
          updatedArray.push({
            ...item,
            restoreRefference: restoreRefference,
            currentChapterId: currentChapterId,
            currentChapterOrderId: chapter.orderId,
            allChaptersCount: allChaptersCount,
            chapterPercentage: chapterPercentage,
          });
        } else {
          updatedArray.push(item);
        }
      });

      user.booksProgress = updatedArray;
    }

    await user.save();
    // Assuming you want to return the bookProgress
    return bookProgress;
  } catch (error) {
    throw new Error(error.message);
  }
};

const saveBookProgress = async (req, res) => {
  const { userId } = req.body;
  const request = { req, res, ...req.body };
  const proceed = await canProceed(req.user._id, userId);

  if (!proceed && req.user.role !== UserRole.Admin) {
    return res.status(401).json({ error: "This user is not eligible to this action" });
  }
  // Enqueue the request for processing
  enqueueRequest(request);
};

const getBookProgress = async (req, res) => {
  const { bookId, userId } = req.params;

  try {
    const user = await User.findById(userId);
    let bookProgress = user.booksProgress.find(x => x.bookId.toString() === bookId);

    if (bookProgress) {
      const chapter = await Chapter.findById(bookProgress.currentChapterId);
      const isAuthor = await isTheAuthor(req.user._id, bookId);

      if (!isAuthor && req.user.role !== UserRole.Admin && chapter.state === ChapterState.Draft) {
        return res.status(200).json(null);
      }
    }

    res.status(200).json(bookProgress || null);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const removeBookProgress = async (req, res) => {
  const { bookId, userId } = req.params;

  try {
    const user = await User.find(userId).select("bookProgress");
    user.booksProgress = user.booksProgress.filter(x => x.bookId.toString() !== bookId);

    res.status(200).json(bookProgress || null);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const startedBooksProgress = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).select("booksProgress");
    const arr = [];
    for (const progress of user.booksProgress) {
      const book = await Book.findById(progress.bookId).select("coverImage backCoverImage");
      arr.push({
        bookId: progress.bookId,
        allChaptersCount: progress.allChaptersCount,
        currentChapterOrderId: progress.currentChapterOrderId,
        currentChapterId: progress.currentChapterId,
        chapterPercentage: progress.chapterPercentage,
        coverImage: book.coverImage,
        backCoverImage: book.backCoverImage,
      })
    }
    res.status(200).json(arr);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const displayName = user.displayName;

    const token = createToken(user._id);
    res.status(200).json({ email, token, displayName, id: user._id, role: user.role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const signupUser = async (req, res) => {
  const { email, password, displayName } = req.body;

  try {
    const user = await User.signup(email, password, displayName);
    const token = createToken(user._id);

    res.status(200).json({ email, token, displayName, id: user._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

async function processRequests() {
  while (requestQueue.length > 0) {
    const request = requestQueue.shift(); // Dequeue the first request
    try {
      processedData = await saveBookProgressHandler(request);
      console.log(`Request processed`);
      request.res.status(200).json(processedData);
    } catch (error) {
      console.error(`Error processing request: ${error}`);
      // Handle the error, such as re-queuing the request for retry
      requestQueue.unshift(request); // Re-queue the failed request at the front
    }
  }
}

async function enqueueRequest(request) {
  requestQueue.push(request);
  if (requestQueue.length === 1) {
    // Start processing requests if the queue was empty
    await processRequests();
  }
}

async function canProceed(currUserId, otherUserId) {
  if (currUserId.toString() !== otherUserId.toString()) {
    return false;
  }

  return true;
}

async function isTheAuthor(currUserId, bookId) {
  const book = await Book.findById(bookId)
  if (currUserId.toString() !== book.authorId.toString()) {
    return false;
  }

  return true;
}

module.exports = {
  loginUser,
  signupUser,
  getUserDetails,
  updateUserDetails,
  saveBookProgress,
  getBookProgress,
  removeBookProgress,
  startedBooksProgress,
  refreshToken,
  searchUser,
  searchUserIds,
};
