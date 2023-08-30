const Book = require("../models/bookModel");
const User = require("../models/userModel");
const Chapter = require("../models/chapterModel");
const Rating = require("../models/ratingModel");
const mongoose = require("mongoose");
const { BookGenre } = require("../enums/BookGenre");
const { UserRole } = require("../enums/UserRole");
const { BookState } = require("../enums/BookState");
const epubParser = require('epub-parser');
const cheerio = require('cheerio');
const epubgen = require('epub-gen-memory').default;
const fs = require('fs');
const epub = require('epub');
const { addChapter } = require("../common/addChapter");
const { ChapterState } = require("../enums/ChapterState");
const QuillDeltaConverter = require('quill-delta-to-html').QuillDeltaToHtmlConverter;

// get all books
const getBooks = async (req, res) => {
  try {
    const books = await Book.find({}).sort({ createdAt: -1 });
    return res.status(200).json(books);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// get search books count
const returnSearchBooksCount = async (req, res) => {
  const { title, authorName, searchString, userId, genre, state } = req.body;

  try {
    let user;
    if (req.user) {
      user = req.user;
    }

    const filter = getSearchBookFilter(title, authorName, searchString, genre, userId, user, state);
    const books = await Book.find(filter);
    return res.status(200).json({ booksCount: books.length });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// search books
const searchBooks = async (req, res) => {
  const { title, authorName, searchString, userId, genre, state, skip, take } = req.body;

  try {
    let user;
    if (req.user) {
      user = req.user;
    }

    const filter = getSearchBookFilter(title, authorName, searchString, genre, userId, user, state);

    const books = await Book.find(filter)
      .skip(skip)
      .limit(take)
      .sort({ createdAt: -1 });
    return res.status(200).json(books);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const addToFavourites = async (req, res) => {
  const { userId, bookId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(404).json({ error: "Invalid user id" });
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(404).json({ error: "Invalid book id" });
  }

  try {
    const proceed = await canProceed(req.user._id, bookId);

    if (!proceed && req.user.role !== UserRole.Admin) {
      return res.status(401).json({ error: "This user is not eligible to this action" });
    }

    const user = await User.findById(userId);

    if (!user.favouriteBooks.includes(bookId)) {
      user.favouriteBooks.push(bookId);
    } else {
      const index = user.favouriteBooks.indexOf(bookId);
      user.favouriteBooks.splice(index, 1);
    }

    user.save();

    return res.status(200).json("OK");
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getFavouriteBooksIds = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid user id" });
  }

  try {
    const user = await User.findById(id);

    return res.status(200).json({ favouriteBookIds: user.favouriteBooks });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const getFavouriteBooks = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid user id" });
  }

  try {
    const user = await User.findById(id).populate("favouriteBooks");

    return res.status(200).json(user.favouriteBooks);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const downloadBook = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid user id" });
  }

  try {
    const book = await Book.findById(id).select("author title coverImage");
    const chapters = await Chapter.find({ bookId: id }).select("content header");
    const mapedChapters = chapters.map(x => ({ content: x.content, title: x.header }));
    const content = [];

    for (const chapter of mapedChapters) {
      const delta = JSON.parse(chapter.content);
      const deltaToHtml = new QuillDeltaConverter(delta.ops);
      const htmlContent = deltaToHtml.convert();

      content.push({
        content: htmlContent,
        title: chapter.title,
      });
    }

    const file = await epubgen({ title: book.title.replace(":", ""), author: book.author, cover: book.coverImage }, content);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=${book.title}.epub`);
    return res.send(file);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const uploadBook = async (req, res) => {
  const { epubBuffer, bookId } = req.body;

  try {
    const quillChapters = await openEpubBufferAndAccessChapters(Buffer.from(epubBuffer));

    const createdChapters = [];

    for (const quillChapter of quillChapters.sort(x => x.orderId)) {
      const { title, content, orderId } = quillChapter;

      // Create a data object for the chapter
      const chapterData = {
        header: title,
        content: content,
        bookId: bookId,
        orderId: orderId,
        state: ChapterState.Finished
      };

      // Use the addChapter method from chaptersController to create a chapter
      const chapter = await addChapter(chapterData);

      createdChapters.push(chapter);
    }

    return res.status(200).json(createdChapters);
  } catch (error) {
    console.error('Error:', error);
    res.status(400).json({ error: 'An error occurred' });
  }
};

// get 1 book
const getBook = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid Id" });
  }

  try {
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    return res.status(200).json(book);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// create book
const createBook = async (req, res) => {
  const {
    coverImage,
    genre,
    title,
    backCoverImage,
    state,
    rating,
    description,
  } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (mongoose.isValidObjectId({ _id: req.user._id }) || !user) {
      throw new Error(`Invalid author id ${req.user._id}`);
    }

    const book = await Book.create({
      coverImage,
      genre,
      title,
      author: user.displayName,
      authorId: user._id,
      backCoverImage,
      state,
      rating,
      description,
    });

    user.books.push(book._id);
    await user.save();

    return res.status(200).json(book);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// delete book
const deleteBook = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid Id" });
  }

  try {
    const proceed = await canProceed(req.user._id, id);

    if (!proceed && req.user.role !== UserRole.Admin) {
      return res.status(401).json({ error: "This user is not eligible to this action" });
    }

    await Rating.deleteMany({ book: id });

    await User.updateMany(
      { favouriteBooks: id },
      { $pull: { favouriteBooks: id } }
    );

    // Should book notes be deleted
    const book = await Book.findOneAndDelete({ _id: id });
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const user = await User.findById({ _id: book.authorId });
    await Chapter.deleteMany({ bookId: book.id });
    user.books.splice(user.books.indexOf(book._id), 1);

    await user.save();

    return res.status(200).json(book);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// update book
const updateBook = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Invalid Id" });
  }

  try {
    const proceed = await canProceed(req.user._id, id);

    if (!proceed && req.user.role !== UserRole.Admin) {
      return res.status(401).json({ error: "This user is not eligible to this action" });
    }

    const { genre, userIds } = req.body;
    const realEnums = Object.values(BookGenre);
    const updatedGenres = [];

    if (genre) {
      for (const item of genre) {
        if (!realEnums.includes(item)) {
          console.log("Unrecognized genre =>", item);
          continue;
        }

        updatedGenres.push(item);
      }
    }

    const book = await Book.findOneAndUpdate(
      { _id: id },
      {
        ...req.body,
        genre: updatedGenres,
        inviteList: userIds,
      }
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    return res.status(200).json(book);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

function getSearchBookFilter(title, authorName, searchString, genre, userId, user, state) {
  let filter = {};

  if (userId && !state) {
    filter.authorId = userId;
  } else if (!title && !authorName && !genre && searchString) {
    filter = {
      $or: [
        { title: { $regex: searchString, $options: "i" } },
        { author: { $regex: searchString, $options: "i" } },
        {
          $expr: {
            $gt: [
              { $size: { $filter: { input: "$genre", cond: { $regexMatch: { input: "$$this", regex: searchString, options: "i" } } } } },
              0
            ]
          }
        },
      ],
    };
  } else {
    if (userId) {
      filter.inviteList = userId;
    }

    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }

    if (authorName) {
      filter.author = { $regex: authorName, $options: "i" };
    }

    if (genre) {
      const genreArray = Array.isArray(genre) ? genre : [genre];
      filter.genre = { $in: genreArray };
    }
  }

  if (user) {
    if (userId !== user._id.toString()) {
      if (user.role !== UserRole.Admin) {
        filter.state = { $nin: [BookState.InvitesOnly, BookState.Draft] }
      } else if (state && user.role === UserRole.Admin) {
        filter.state = state;
      }
    }
  } else {
    filter.state = { $nin: [BookState.InvitesOnly, BookState.Draft] }
  }

  return filter;
}

async function canProceed(userId, bookId) {
  const book = await Book.findById(bookId).select("authorId");

  if (book.authorId.toString() !== userId.toString()) {
    return false;
  }

  return true;
}

async function convertEpubToQuillDelta(epubBuffer) {
  const epubData = await new Promise((resolve, reject) => {
    epubParser.open(epubBuffer, (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });

  const quillDeltas = [];
  for (const chapter of epubData.raw.json.ncx.navMap[0].navPoint) {
    const chapterHref = chapter.content[0]['$'].src;
    const chapterHtml = epubParser.extractText(chapterHref);
    const quillDelta = await convertToQuillDelta(chapterHtml);
    quillDeltas.push(quillDelta);
  }

  return quillDeltas;
}

async function openEpubBufferAndAccessChapters(epubBuffer) {
  return new Promise((resolve, reject) => {
    const book = new epub(epubBuffer);
    const quillChapters = [];
    let undefinedChaptersCount = 0;
    book.on('end', () => {
      let chapterOrder = 1;
      const sorted = book.flow.sort(x => x.order);
      const promises = sorted.map((chapter, index) => {
        return new Promise((resolveChapter, rejectChapter) => {
          book.getChapter(chapter.id, (error, text) => {
            if (error) {
              console.error(`Error reading chapter ${index + 1}:`, error);
              rejectChapter(error);
            } else {
              const $ = cheerio.load(text);
              const quillDeltas = [];

              $('p').each((index, pTag) => {
                const text = $(pTag).text().trim();

                if (text.length > 0) { // Ignore empty text
                  quillDeltas.push({ insert: text });
                  quillDeltas.push({ insert: '\n\n' }); // Add a line break
                }
              });

              let title;

              if (chapter.title) {
                title = chapter.title
              } else if (quillDeltas[0]) {
                title = quillDeltas[0].insert;
              } else {
                undefinedChaptersCount++;
                title = `Chapter with no title ${undefinedChaptersCount}`;
              }

              quillChapters.push({ title: title, orderId: index + 1, content: JSON.stringify({ ops: quillDeltas }) });
              chapterOrder++;
            }

            resolveChapter();
          });
        });
      });

      Promise.all(promises)
        .then(() => {
          resolve(quillChapters);
        })
        .catch((error) => {
          reject(error);
        });
    });

    book.parse();
  });
}
// Function to convert HTML to Quill Delta
async function convertToQuillDelta(html) {
  const $ = cheerio.load(html);
  const textContent = $('body').text();

  const deltaOps = [
    { insert: textContent },
    // Add more ops for formatting, headings, etc.
  ];

  return deltaOps;
}

async function fetchChapterContent(rootPath, chapterHref) {
  const chapterPath = `${chapterHref}`;
  const chapterContent = await fs.promises.readFile(chapterPath, 'utf-8');
  return chapterContent;
}


module.exports = {
  getBooks,
  getBook,
  getFavouriteBooksIds,
  getFavouriteBooks,
  returnSearchBooksCount,
  searchBooks,
  createBook,
  deleteBook,
  updateBook,
  addToFavourites,
  downloadBook,
  uploadBook,
};
