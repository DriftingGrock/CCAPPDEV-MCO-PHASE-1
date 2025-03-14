const Review = require('../database/models/models').Review;
const Establishment = require('../database/models/models').Establishment;
const User = require('../database/models/models').User;

exports.postReview = async (req, res) => {
    try {
        const { establishmentId, title, body, rating } = req.body;

        if (!establishmentId || !title || !body || !rating) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const defaultUser = await User.findOne();
        if (!defaultUser) {
            return res.status(500).json({ error: "No default user found. Please add a user to the database." });
        }

        let mediaUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const newReview = new Review({
            establishmentId,
            userId: defaultUser._id,
            username: defaultUser.username,
            title,
            body,
            rating,
            media: mediaUrls
        });

        await newReview.save();
        await Establishment.findByIdAndUpdate(establishmentId, { $push: { reviews: newReview._id } });
        await User.findByIdAndUpdate(defaultUser._id, {
            $push: { reviews: newReview._id },
            $inc: { 'stats.reviewsMade': 1 }
        });

        res.status(201).json({ message: "Review posted successfully", review: newReview });
    } catch (err) {
        console.error("Error posting review:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ establishmentId: req.params.establishmentId })
            .populate("userId", "username avatar")
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

exports.editReview = async (req, res) => {
    try {
        const { title, body, rating } = req.body;

        const updatedReview = await Review.findByIdAndUpdate(
            req.params.id,
            { title, body, rating, edited: true, updatedAt: new Date() },
            { new: true }
        );

        if (!updatedReview) return res.status(404).json({ error: "Review not found" });

        res.json(updatedReview);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error updating review" });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: "Review not found" });

        await Review.findByIdAndDelete(req.params.id);
        await Establishment.findByIdAndUpdate(review.establishmentId, { $pull: { reviews: req.params.id } });
        await User.findByIdAndUpdate(review.userId, {
            $pull: { reviews: req.params.id },
            $inc: { 'stats.reviewsMade': -1 }
        });

        res.json({ message: "Review deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error deleting review" });
    }
};