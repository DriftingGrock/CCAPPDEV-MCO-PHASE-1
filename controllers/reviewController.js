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

        // Update user's reviews list
        await User.findByIdAndUpdate(defaultUser._id, {
            $push: { reviews: newReview._id },
            $inc: { "stats.reviewsMade": 1 } // ✅ Increase review count
        }, { new: true });

        // ✅ Emit socket event to update user profiles
        if (global.io) {
            global.io.emit('reviewUpdated');
        } else {
            console.error("Socket.io is not initialized");
        }

        
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
        if (global.io) {
            global.io.emit('reviewUpdated'); // ✅ Notify profile pages
            global.io.emit('userProfileUpdated', { userId: defaultUser._id }); // ✅ Specific user profile update
        }
         else {
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
        await User.findByIdAndUpdate(review.userId, {
            $pull: { reviews: review._id },
            $inc: { "stats.reviewsMade": -1 } // ✅ Reduce count
        }, { new: true });

        const establishment = await Establishment.findById(review.establishmentId).populate('reviews');
        const totalRating = establishment.reviews.reduce((sum, r) => sum + r.rating, 0);
        establishment.overallRating = establishment.reviews.length
            ? (totalRating / establishment.reviews.length).toFixed(1)
            : 0;

        await establishment.save();

        // Emit socket event to update client
        if (global.io) {
            global.io.emit('reviewUpdated'); // ✅ Notify profile pages
            global.io.emit('userProfileUpdated', { userId: defaultUser._id }); // ✅ Specific user profile update
        }
         else {
            console.error("Socket.io is not initialized");
        }

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

//------------------EDIT AND DELETE REPLY---------------------------
// Edit Reply
exports.editReply = async (req, res) => {
    try {
        const { body } = req.body;
        const replyId = req.params.id;

        const updatedReply = await Review.findOneAndUpdate(
            { 'ownerResponse._id': replyId },
            { $set: { 'ownerResponse.body': body, 'ownerResponse.edited': true, 'ownerResponse.updatedAt': new Date() } },
            { new: true }
        );

        if (!updatedReply) return res.status(404).json({ error: "Reply not found" });

        res.json(updatedReply);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error updating reply" });
    }
};

// Delete Reply
exports.deleteReply = async (req, res) => {
    try {
        const replyId = req.params.id;

        const updatedReview = await Review.findOneAndUpdate(
            { 'ownerResponse._id': replyId },
            { $unset: { ownerResponse: 1 } },
            { new: true }
        );

        if (!updatedReview) return res.status(404).json({ error: "Reply not found" });

        res.json({ message: "Reply deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error deleting reply" });
    }
};