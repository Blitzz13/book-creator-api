const Rating = require("../models/ratingModel");
const Book = require("../models/bookModel");
const { UserRole } = require("../enums/UserRole");
const mongoose = require('mongoose');
const { Order } = require("../enums/Order");
const { RatingSort } = require("../enums/RatingSort");

const createRating = async (req, res) => {
    try {
        const { bookId } = req.params;
        const { rating, comment } = req.body;

        if (!doesBookExists(bookId)) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (!doesBookExists(bookId)) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const newRating = await Rating.create({
            user: req.user._id,
            book: bookId,
            rating: rating,
            comment: comment
        });

        return res.status(200).json(newRating);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating rating' });
    }
};

const updateRating = async (req, res) => {
    try {
        const { ratingId } = req.params;
        const { rating, comment } = req.body;

        const proceed = await canProceed(req.user._id, ratingId);

        if (!proceed && req.user.role !== UserRole.Admin) {
            return res.status(401).json({ error: "This user is not eligible to this action" });
        }

        const foundRating = await Rating.findById(ratingId).select("user");

        if (!foundRating) {
            return res.status(404).json({ message: 'Rating not found' });
        }

        if (foundRating.user.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: 'This user cannot do that action' });
        }

        if (rating) {
            foundRating.rating = rating;
        }

        if (comment) {
            foundRating.comment = comment;
        }

        await foundRating.save();
        return res.status(200).json(foundRating);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating rating' });
    }
};

const deleteRating = async (req, res) => {
    try {
        const ratingId = req.params.ratingId;

        const proceed = await canProceed(req.user._id, ratingId);

        if (!proceed && req.user.role !== UserRole.Admin) {
            return res.status(401).json({ error: "This user is not eligible to this action" });
        }

        const foundRating = await Rating.findById(ratingId);
        if (!foundRating) {
            return res.status(404).json({ message: 'Rating not found' });
        }

        // Check if the user has the permission to delete the rating
        if (foundRating.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Permission denied' });
        }

        await Rating.deleteOne({ _id: ratingId });

        res.status(200).json({ message: 'Rating deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting rating' });
    }
};

const getAverageRatingForBook = async (req, res) => {
    try {
        const bookId = req.params.bookId;

        if (!doesBookExists(bookId)) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const objectIdBookId = new mongoose.Types.ObjectId(bookId);
        const averageRatings = await Rating.aggregate([
            {
                $match: { book: objectIdBookId } // Filter ratings for the specified book ID
            },
            {
                $group: {
                    _id: '$book',
                    averageRating: { $avg: '$rating' },
                    numberOfRatings: { $sum: 1 }, // Count the total ratings for the book
                    comment: { $push: '$comment' }
                }
            }
        ]);

        // Set average to 0 for books with no ratings
        averageRatings.forEach((rating) => {
            if (rating.numberOfRatings === 0) {
                rating.averageRating = 0;
            }
        });

        if (averageRatings.length > 0) {
            const result = averageRatings[0];
            res.status(200).json({
                bookId: result._id,
                averageRating: result.averageRating,
                comment: result.comment,
                numberOfRatings: result.numberOfRatings,
            });
        } else {
            res.status(200).json({
                bookId: bookId,
                averageRating: 0,
                numberOfRatings: 0,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving average rating' });
    }
}

const getAllUserRatings = async (req, res) => {
    try {
        const userId = req.params.userId;

        const ratings = await Rating.find({ user: userId }).select("rating comment book");

        const maped = ratings.map(x => ({
            bookId: x.book,
            rating: x.rating,
            comment: x.comment,
        }));

        res.status(200).json(maped);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving user ratings' });
    }
}

const getUserRatingOfBook = async (req, res) => {
    try {
        const userId = req.params.userId;
        const bookId = req.params.bookId;

        const rating = await Rating.findOne({ user: userId, book: bookId }).select("_id rating comment book");

        res.status(200).json(rating);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving user ratings' });
    }
}

const getAllRatingsOfBook = async (req, res) => {
    try {
        const { bookId, order, sort } = req.body;

        let sortOptions = {};
        if (sort === RatingSort.ByDate) {
            sortOptions = { createdAt: order === Order.Acending ? 1 : -1 };
        } else if (sort === RatingSort.ByRating) {
            sortOptions = { rating: order === Order.Acending ? 1 : -1 };
        }

        const ratings = await Rating.find({ book: bookId })
            .populate({
                path: 'user',
                select: 'displayName _id'
            })
            .sort(sortOptions);

        const formattedRatings = ratings.map(rating => ({
            displayName: rating.user.displayName,
            book: rating.book,
            comment: rating.comment,
            id: rating._id,
            userId: rating.user._id,
            rating: rating.rating
        }));

        res.status(200).json(formattedRatings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving book ratings' });
    }
}

const getAverageRatingForMultipleBooks = async (req, res) => {
    try {
        const { bookIds } = req.body;

        const objectIdBookIds = bookIds.map((id) => new mongoose.Types.ObjectId(id));
        const averageRatings = await Rating.aggregate([
            {
                $match: { book: { $in: objectIdBookIds } } // Filter ratings for specified book IDs
            },
            {
                $group: {
                    _id: '$book',
                    averageRating: { $avg: '$rating' },
                    numberOfRatings: { $sum: 1 }, // Count the total ratings for each book
                    comment: { $push: '$comment' }
                }
            }
        ]);

        // Set average to 0 for books with no ratings
        averageRatings.forEach((rating) => {
            if (rating.numberOfRatings === 0) {
                rating.averageRating = 0;
            }
        });

        res.status(200).json(averageRatings.map(x => ({
            bookId: x._id,
            averageRating: x.averageRating,
            comment: x.comment,
            numberOfRatings: x.numberOfRatings,
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving average ratings' });
    }
}

async function doesBookExists(bookId) {
    const existingBook = await Book.findOne({ _id: bookId });

    if (existingBook) {
        return true;
    }

    return false;
}

async function canProceed(userId, ratingId) {
    const rating = await Rating.findById(ratingId).select("user");

    if (rating.user.toString() !== userId.toString()) {
        return false;
    }

    return true;
}

module.exports = {
    createRating,
    updateRating,
    getAverageRatingForBook,
    getAverageRatingForMultipleBooks,
    deleteRating,
    getAllUserRatings,
    getUserRatingOfBook,
    getAllRatingsOfBook,
};
