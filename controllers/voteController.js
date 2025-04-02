const Vote = require('../database/models/models').Vote;
const Review = require('../database/models/models').Review;

exports.vote = async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    try {
        const { reviewId, userId, voteType } = req.body;

        if (!reviewId || !userId || !voteType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (voteType !== 'up' && voteType !== 'down') {
            return res.status(400).json({ error: "Vote type must be 'up' or 'down'" });
        }

        const existingVote = await Vote.findOne({ reviewId, userId });
        let updatedReview;

        if (existingVote) {
            if (existingVote.voteType === voteType) {
                // Remove vote
                await Vote.deleteOne({ _id: existingVote._id });

                if (voteType === 'up') {
                    updatedReview = await Review.findByIdAndUpdate(
                        reviewId,
                        { $inc: { upvoteCount: -1 } },
                        { new: true }
                    );
                } else {
                    updatedReview = await Review.findByIdAndUpdate(
                        reviewId,
                        { $inc: { downvoteCount: -1 } },
                        { new: true }
                    );
                }

                return res.json({
                    success: true,
                    message: "Vote removed",
                    upvoteCount: updatedReview.upvoteCount,
                    downvoteCount: updatedReview.downvoteCount,
                    userVote: null
                });
            } else {
                // Change vote type
                existingVote.voteType = voteType;
                await existingVote.save();

                if (voteType === 'up') {
                    updatedReview = await Review.findByIdAndUpdate(
                        reviewId,
                        { $inc: { upvoteCount: 1, downvoteCount: -1 } },
                        { new: true }
                    );
                } else {
                    updatedReview = await Review.findByIdAndUpdate(
                        reviewId,
                        { $inc: { upvoteCount: -1, downvoteCount: 1 } },
                        { new: true }
                    );
                }

                return res.json({
                    success: true,
                    message: "Vote updated",
                    upvoteCount: updatedReview.upvoteCount,
                    downvoteCount: updatedReview.downvoteCount,
                    userVote: voteType
                });
            }
        } else {
            // New vote
            const newVote = new Vote({
                reviewId,
                userId,
                voteType
            });
            await newVote.save();

            if (voteType === 'up') {
                updatedReview = await Review.findByIdAndUpdate(
                    reviewId,
                    { $inc: { upvoteCount: 1 } },
                    { new: true }
                );
            } else {
                updatedReview = await Review.findByIdAndUpdate(
                    reviewId,
                    { $inc: { downvoteCount: 1 } },
                    { new: true }
                );
            }

            return res.json({
                success: true,
                message: "Vote recorded",
                upvoteCount: updatedReview.upvoteCount,
                downvoteCount: updatedReview.downvoteCount,
                userVote: voteType
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
};

exports.getVotes = async (req, res) => {
    try {
        const { userId, establishmentId } = req.params;

        const reviews = await Review.find({ establishmentId });
        const reviewIds = reviews.map(review => review._id);

        const votes = await Vote.find({
            userId,
            reviewId: { $in: reviewIds }
        });

        const voteMap = {};
        votes.forEach(vote => {
            voteMap[vote.reviewId] = vote.voteType;
        });

        res.json(voteMap);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

exports.voteSimple = async (req, res) => {
    try {
        const { reviewId, voteType } = req.body;

        if (!reviewId || !voteType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (voteType !== 'up' && voteType !== 'down') {
            return res.status(400).json({ error: "Vote type must be 'up' or 'down'" });
        }

        if (voteType === 'up') {
            await Review.findByIdAndUpdate(reviewId, { $inc: { upvoteCount: 1 } });
        } else {
            await Review.findByIdAndUpdate(reviewId, { $inc: { downvoteCount: 1 } });
        }

        // In all return statements, include the updated counts:
        return res.json({
            message: "Vote recorded",
            success: true,
            upvoteCount: updatedReview.upvoteCount,
            downvoteCount: updatedReview.downvoteCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};