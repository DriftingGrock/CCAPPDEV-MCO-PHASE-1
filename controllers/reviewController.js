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
        
        // ✅ Use { new: true } to update and return latest version
        const updatedEstablishment = await Establishment.findByIdAndUpdate(
            establishmentId,
            { $push: { reviews: newReview._id } },
            { new: true }
        ).populate('reviews');
        
        const totalRating = updatedEstablishment.reviews.reduce((sum, r) => sum + r.rating, 0);
        updatedEstablishment.overallRating = (totalRating / updatedEstablishment.reviews.length).toFixed(1);
        await updatedEstablishment.save();
        
        // ✅ Emit socket event
        if (global.io) {
            global.io.emit('reviewUpdated');
        } else {
            console.error("Socket.io is not initialized");
        }        

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

        // Update establishment rating
        const establishment = await Establishment.findById(updatedReview.establishmentId).populate('reviews');
        const totalRating = establishment.reviews.reduce((sum, r) => sum + r.rating, 0);
        establishment.overallRating = (totalRating / establishment.reviews.length).toFixed(1);
        await establishment.save();

        // Emit socket event to update client
        io.emit('reviewUpdated');

        if (io) {
            io.emit('reviewUpdated');
        } else {
            console.error("Socket.io is not initialized");
        }
        
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

        const establishment = await Establishment.findById(review.establishmentId).populate('reviews');
        const totalRating = establishment.reviews.reduce((sum, r) => sum + r.rating, 0);
        establishment.overallRating = establishment.reviews.length
            ? (totalRating / establishment.reviews.length).toFixed(1)
            : 0;

        await establishment.save();

        // Emit socket event to update client
        io.emit('reviewUpdated');

        if (io) {
            io.emit('reviewUpdated');
        } else {
            console.error("Socket.io is not initialized");
        }        

        res.json({ message: "Review deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error deleting review" });
    }
};

exports.replyToReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { body } = req.body;
        const ownerId = req.user._id; // Get owner ID from session/auth

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ error: "Review not found" });
        }

        review.ownerResponse = {
            ownerId,
            body,
            media: [],
            upvoteCount: 0, // ✅ Initialize vote counts
            downvoteCount: 0,
            edited: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await review.save();
        res.json({ message: "Reply submitted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to submit reply" });
    }
};

