const mongoose = require('mongoose');
const Establishment = require('../database/models/models').Establishment;
const Review = require('../database/models/models').Review;
const Menu = require('../database/models/models').Menu;
const Photo = require('../database/models/models').Photo;

const getRatingData = (reviews) => {
    const ratingCounts = [0, 0, 0, 0, 0]; // Index 0 = 1-star, Index 4 = 5-star
    let totalRating = 0;

    reviews.forEach(review => {
        ratingCounts[review.rating - 1]++;
        totalRating += review.rating;
    });

    const totalRatings = ratingCounts.reduce((sum, count) => sum + count, 0);
    const averageRating = totalRatings > 0 ? (totalRating / totalRatings).toFixed(1) : 0;

    const ratingData = ratingCounts.map((count, index) => ({
        star: index + 1,
        count: count,
        percentage: totalRatings > 0 ? (count / totalRatings) * 100 : 0
    }));

    return { ratingData, averageRating, totalRatings };
};

exports.getHomePage = async (req, res) => {
    try {
        // Get recommended establishments based on latest overall rating
        const recommendedEstablishments = await Establishment.find()
            .sort({ overallRating: -1 }) // Sort by highest rating
            .limit(5)
            .lean();

        // Get latest reviews
        const recentReviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('establishmentId', 'name bannerImage overallRating') // Include latest overallRating
            .populate('userId', 'username')
            .lean();

        res.render('index', { recommendedEstablishments, recentReviews });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getRestoList = async (req, res) => {
    try {
        let matchQuery = {};
        let sortOption = {};

        if (req.query.search) {
            const searchTerm = req.query.search.trim();
            matchQuery = {
                $or: [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } }
                ]
            };
        }

        switch (req.query.sort) {
            case 'best':
                sortOption = { overallRating: -1 };
                break;
            case 'most':
                sortOption = { numReviews: -1 };
                break;
            case 'recent':
                sortOption = { updatedAt: -1 };
                break;
            default:
                sortOption = { name: 1 };
        }

        // Ensure the number of reviews is always up to date
        const establishments = await Establishment.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "reviews",
                    localField: "reviews",
                    foreignField: "_id",
                    as: "reviews"
                }
            },
            { 
                $addFields: { 
                    numReviews: { $size: "$reviews" }  // ✅ Dynamically count reviews
                } 
            },
            { $sort: sortOption }
        ]);

        res.render('restoList', { establishments });
    } catch (error) {
        console.error("Error in /restoList:", error);
        res.status(500).send('Server Error');
    }
};

exports.getRestoProfile = async (req, res) => { // Assuming this is the function name
    try {
        const loggedInUserId = req.session.userId ? new mongoose.Types.ObjectId(req.session.userId) : null; // Get logged-in user ID
        const establishmentId = new mongoose.Types.ObjectId(req.params.id); // Get establishment ID from URL

        const establishment = await Establishment.findById(establishmentId)
            .populate({
                path: 'reviews',
                options: { sort: { createdAt: -1 } }, // Example sort
                populate: [
                    { path: 'userId', select: 'username avatar _id' }, // Select necessary user fields including _id
                    { path: 'ownerResponse.ownerId', select: 'username avatar' }
                    // Add other necessary populates
                ]
            })
            .lean(); // Use lean for easier manipulation

        if (!establishment) {
            return res.status(404).send('Establishment not found');
        }

        // Add ownership flag to each review
        if (establishment.reviews && establishment.reviews.length > 0) {
            establishment.reviews = establishment.reviews.map(review => {
                // Check if review.userId exists and is populated correctly
                const isReviewOwner = loggedInUserId && review.userId && loggedInUserId.equals(review.userId._id);
                return { ...review, isReviewOwner: isReviewOwner };
            });
        }

        // Fetch other data like menu, photos if necessary
        // const menu = await Menu.findOne({ establishmentId: establishmentId }).lean();
        // const photos = await Photo.find({ establishmentId: establishmentId }).lean();

        // Calculate rating data
        const { ratingData, averageRating, totalRatings } = getRatingData(establishment.reviews || []);

        res.render('restoProfile', { // Assuming the view is named restoProfile.hbs
            establishment: establishment,
            reviews: establishment.reviews || [], // Pass reviews separately or rely on establishment.reviews
            ratingData: ratingData,
            averageRating: averageRating,
            totalRatings: totalRatings,
            loggedInUser: req.session.userId // Pass loggedInUser if needed
            // menu: menu,
            // photos: photos,
            // Pass other necessary data
        });

    } catch (err) {
        console.error("Error fetching establishment profile:", err);
        // Check for CastError specifically (invalid ObjectId format)
        if (err.name === 'CastError') {
            return res.status(400).send('Invalid Establishment ID format');
        }
        res.status(500).send('Server Error');
    }
};



exports.editRestoProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const updateData = { name, description };

        if (req.file) {
            const bannerUrl = `/uploads/${req.file.filename}`;
            updateData.bannerImage = bannerUrl;
        }

        await Establishment.findByIdAndUpdate(id, updateData);

        res.json({
            success: true,
            bannerUrl: updateData.bannerImage
        });
    } catch (error) {
        console.error('Error updating restaurant profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update restaurant profile'
        });
    }
};

exports.getRestoProfileOwner = async (req, res) => {
    try {
        const sortOption = req.query.sort || 'desc';
        let sortQuery = {};

        if (sortOption === 'upvotes') {
            sortQuery = { upvoteCount: -1 };
        } else if (sortOption === 'asc') {
            sortQuery = { rating: 1 };
        } else {
            sortQuery = { rating: -1 };
        }

        const establishment = await Establishment.findById(req.params.id)
            .populate({
                path: 'reviews',
                options: { sort: sortQuery },
                populate: [
                    { path: 'userId', select: 'username avatar' },
                    { path: 'ownerResponse.ownerId', select: 'username avatar' },
                ],
            })
            .lean();

        const menu = await Menu.findOne({ establishmentId: req.params.id }).lean();
        const photos = await Photo.find({ establishmentId: req.params.id }).lean();

        if (!establishment) {
            return res.status(404).send('Establishment not found');
        }

        const { ratingData, averageRating, totalRatings } = getRatingData(establishment.reviews);
        const isOwner = true;
        const isOwnerView = true;

        res.render('restoProfile', {
            establishment,
            menu,
            photos,
            ratingData,
            averageRating,
            totalRatings,
            isOwner,
            isOwnerView,
            sortOption,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Function to reply to a review
exports.replyToReview = async (req, res) => {
    try {
        const { reviewId } = req.params; // Get the review ID from the URL
        const { body } = req.body; // Get the reply body from the request
        const ownerId = '67d2b0d20b0edd4f6d204780' // PLACEHOLDER FOR NOW

        // Find the review by ID
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // Add the owner's reply to the review
        review.ownerResponse = {
            ownerId,
            body,
            media: [], // You can add media URLs here if needed
            upvoteCount: 0,
            downvoteCount: 0,
            edited: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Save the updated review
        await review.save();

        // Return success response
        res.json({ success: true, message: 'Reply submitted successfully' });
    } catch (error) {
        console.error('Error replying to review:', error);
        res.status(500).json({ success: false, message: 'Failed to submit reply' });
    }
};