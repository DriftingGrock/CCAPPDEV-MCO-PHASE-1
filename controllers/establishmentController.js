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

        const establishments = await Establishment.aggregate([
            { $match: matchQuery },
            { $addFields: { numReviews: { $size: "$reviews" } } },
            { $sort: sortOption }
        ]);

        res.render('restoList', { establishments });
    } catch (error) {
        console.error("Error in /restoList:", error);
        res.status(500).send('Server Error');
    }
};

exports.getRestoProfile = async (req, res) => {
    try {
        const sortOption = req.query.sort || 'desc';
        let sortQuery = {};

        if (sortOption === 'upvotes') {
            sortQuery = { upvoteCount: -1 }; // ✅ Most upvoted
        } else if (sortOption === 'asc') {
            sortQuery = { rating: 1 }; // ✅ Lowest to highest rating
        } else {
            sortQuery = { rating: -1 }; // ✅ Highest to lowest rating (default)
        }

        // Convert `req.params.id` to ObjectId
        const establishmentId = new mongoose.Types.ObjectId(req.params.id);

        // Fetch establishment details and reviews
        const establishment = await Establishment.findById(establishmentId)
            .populate({
                path: 'reviews',
                options: { sort: sortQuery },
                populate: [
                    { path: 'userId', select: 'username avatar' },
                    { path: 'ownerResponse.ownerId', select: 'username avatar' }
                ]
            })
            .lean();

        if (!establishment) {
            return res.status(404).send('Establishment not found');
        }

        // Fetch menu and photos
        const menu = await Menu.findOne({ establishmentId }).lean();
        const photos = await Photo.find({ establishmentId }).lean();

        // Debugging logs
        console.log("Restaurant ID:", req.params.id);
        console.log("Menu Data Sent to HBS:", JSON.stringify(menu, null, 2));
        console.log("Photos Data Sent to HBS:", JSON.stringify(photos, null, 2));

        // Ensure menu and photos are never null
        const menuData = menu ? menu : { items: [] };
        const photosData = photos.length > 0 ? photos : [];

        const { ratingData, averageRating, totalRatings } = getRatingData(establishment.reviews);

        res.render('restoProfile', {
            establishment,
            menu: menuData,
            photos: photosData,
            ratingData,
            averageRating,
            totalRatings,
            sortOption
        });
    } catch (err) {
        console.error("Error in getRestoProfile:", err);
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