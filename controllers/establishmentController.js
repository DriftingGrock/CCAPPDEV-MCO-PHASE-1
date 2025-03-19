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
            sortQuery = { upvoteCount: -1 };
        } else if (sortOption === 'asc') {
            sortQuery = { rating: 1 };
        } else {
            sortQuery = { rating: -1 };
        }

        const establishment = await Establishment.findById(req.params.id)
        .populate({
            path: 'reviews',
            options: { sort: { createdAt: -1 } }, // ✅ Sort by latest
            populate: [{ path: 'userId', select: 'username avatar' },
                       { path: 'ownerResponse.ownerId', select: 'username avatar' }]
        })
        .lean();
    
    if (!establishment) {
        return res.status(404).send('Establishment not found');
    }
    
    const { ratingData, averageRating, totalRatings } = getRatingData(establishment.reviews);
    
    res.render('restoProfile', {
        establishment,
        ratingData,
        averageRating,
        totalRatings
    });
    
    } catch (err) {
        console.error(err);
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