const Review = require('../database/models/models').Review;
const Establishment = require('../database/models/models').Establishment;
const User = require('../database/models/models').User;

exports.postReview = async (req, res) => {
    try {
        const { establishmentId, title, body, rating } = req.body;

        if (!establishmentId || !title || !body || !rating) {
            return res.status(400).json({ error: "Missing required fields" });
        }

		// Get the current user from session
		if (!req.session.userId) {
			return res.status(401).json({ error: "User not authenticated" });
		}

		const currentUser = await User.findById(req.session.userId);
		if (!currentUser) {
			return res.status(404).json({ error: "User not found" });
		}

        let mediaUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

		const newReview = new Review({
			establishmentId,
			userId: currentUser._id,
			username: currentUser.username,
			title,
			body,
			rating,
			media: mediaUrls
		});
        
        await newReview.save();

        // Update user's reviews list
		await User.findByIdAndUpdate(currentUser._id, {
			$push: { reviews: newReview._id },
			$inc: { "stats.reviewsMade": 1 }
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

        // Fetch the user who wrote the review
        const reviewUser = await User.findById(updatedReview.userId);
        if (!reviewUser) return res.status(404).json({ error: "User not found" });

        // Update establishment rating
        const establishment = await Establishment.findById(updatedReview.establishmentId).populate('reviews');
        const totalRating = establishment.reviews.reduce((sum, r) => sum + r.rating, 0);
        establishment.overallRating = (totalRating / establishment.reviews.length).toFixed(1);
        await establishment.save();

        // Emit socket event to update UI
        if (global.io) {
            global.io.emit('reviewUpdated');
            global.io.emit('userProfileUpdated', { userId: reviewUser._id });
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

        // Find the user who posted the review
        const reviewUser = await User.findById(review.userId);
        if (!reviewUser) return res.status(404).json({ error: "User not found" });

        // Remove the review from the database
        await Review.findByIdAndDelete(req.params.id);

        // Remove the review from the user's list
        await User.findByIdAndUpdate(review.userId, {
            $pull: { reviews: review._id },
            $inc: { "stats.reviewsMade": -1 }
        }, { new: true });

        // Remove the review from the establishment's reviews array
        const updatedEstablishment = await Establishment.findByIdAndUpdate(
            review.establishmentId,
            { $pull: { reviews: review._id } },  // ✅ Remove the review ID from the array
            { new: true }
        ).populate('reviews');

        // Recalculate the overall rating
        const totalRating = updatedEstablishment.reviews.reduce((sum, r) => sum + r.rating, 0);
        updatedEstablishment.overallRating = updatedEstablishment.reviews.length
            ? (totalRating / updatedEstablishment.reviews.length).toFixed(1)
            : 0;

        await updatedEstablishment.save(); // ✅ Save the updated establishment

        // Emit socket events to update UI
        if (global.io) {
            global.io.emit('reviewUpdated');
            global.io.emit('userProfileUpdated', { userId: reviewUser._id });
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
// Edit Reply
exports.editReply = async (req, res) => {
    try {
        const { body } = req.body;
        const reviewId = req.params.id;
        
        console.log(`Editing reply for review ID: ${reviewId} with new body: "${body}"`);

        // Use direct MongoDB update operation instead of find-then-save
        const result = await Review.updateOne(
            { _id: reviewId, 'ownerResponse': { $exists: true } },
            { 
                $set: { 
                    'ownerResponse.body': body,
                    'ownerResponse.edited': true,
                    'ownerResponse.updatedAt': new Date()
                } 
            }
        );
        
        console.log("Update result:", result);
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Reply not found" });
        }
        
        if (result.modifiedCount === 0) {
            return res.status(400).json({ error: "No changes made" });
        }
        
        // Get the updated review to return in response
        const updatedReview = await Review.findById(reviewId);
        
        res.json(updatedReview);
    } catch (err) {
        console.error("Error updating reply:", err);
        res.status(500).json({ error: "Error updating reply", details: err.message });
    }
};
// Delete Reply
exports.deleteReply = async (req, res) => {
    try {
        const reviewId = req.params.id;

        const review = await Review.findById(reviewId);
        if (!review || !review.ownerResponse) {
            return res.status(404).json({ error: "Reply not found" });
        }

        review.ownerResponse = null;
        await review.save();

        res.json({ message: "Reply deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error deleting reply" });
    }
};