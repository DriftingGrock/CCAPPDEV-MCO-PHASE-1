const User = require('../database/models/models').User;
const Establishment = require('../database/models/models').Establishment;

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.user)
        .populate({
            path: 'reviews',
            options: { sort: { createdAt: -1 } },
            populate: [
                { path: 'establishmentId', select: 'name' },
                { path: 'ownerResponse.ownerId', select: 'username avatar' },
                { path: 'userId', select: 'username avatar' }
            ]
        })
        .select("username avatar bio stats.reviewsMade") // ✅ Fetch updated review count
        .lean();

        if (!user) {
            return res.status(404).send('User not found');
        }

        const ownedEstablishments = await Establishment.find({ ownerId: req.params.user }).lean();

        const ratingCounts = [0, 0, 0, 0, 0];
        const userReviews = user.reviews || [];

        userReviews.forEach(review => {
            if (review.rating >= 1 && review.rating <= 5) {
                ratingCounts[review.rating - 1]++;
            }
        });

        const totalUserRatings = ratingCounts.reduce((sum, count) => sum + count, 0);
        const userRatingData = ratingCounts.map((count, index) => ({
            star: index + 1,
            count: count,
            percentage: totalUserRatings > 0 ? (count / totalUserRatings) * 100 : 0
        }));

        res.render('userProfile', {
            user,
            ownedEstablishments,
            userRatingData,
            totalUserRatings
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.editUserProfile = async (req, res) => {
    try {
        const { name, bio } = req.body;
        const userId = req.params.user;
        let updateFields = { username: name, bio };

        if (req.file) {
            const avatarPath = `/uploads/${req.file.filename}`;
            updateFields.avatar = avatarPath;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });

        res.json({
            success: true,
            avatarUrl: updatedUser.avatar || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};