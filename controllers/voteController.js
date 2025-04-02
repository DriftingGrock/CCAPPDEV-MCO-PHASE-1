const Vote = require('../database/models/models').Vote;
const Review = require('../database/models/models').Review;
const mongoose = require('mongoose');

exports.vote = async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    try {
        const { reviewId, userId, voteType } = req.body;
        console.log(`Vote request received: reviewId=${reviewId}, userId=${userId}, voteType=${voteType}`);

        if (!reviewId || !userId || !voteType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (voteType !== 'up' && voteType !== 'down') {
            return res.status(400).json({ error: "Vote type must be 'up' or 'down'" });
        }

        // Make sure we have valid ObjectIds
        const reviewObjectId = new mongoose.Types.ObjectId(reviewId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const existingVote = await Vote.findOne({ 
            reviewId: reviewObjectId, 
            userId: userObjectId 
        });
        
        let updatedReview;

        if (existingVote) {
            console.log(`Existing vote found: ${existingVote._id}, type: ${existingVote.voteType}`);
            if (existingVote.voteType === voteType) {
                // Remove vote
                await Vote.deleteOne({ _id: existingVote._id });
                console.log(`Vote removed: ${existingVote._id}`);

                if (voteType === 'up') {
                    updatedReview = await Review.findByIdAndUpdate(
                        reviewObjectId,
                        { $inc: { upvoteCount: -1 } },
                        { new: true }
                    );
                } else {
                    updatedReview = await Review.findByIdAndUpdate(
                        reviewObjectId,
                        { $inc: { downvoteCount: -1 } },
                        { new: true }
                    );
                }
                
                if (global.io) {
                    global.io.emit('voteUpdated', { reviewId: reviewId });
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
                console.log(`Vote updated to: ${voteType}`);

                if (voteType === 'up') {
                    updatedReview = await Review.findByIdAndUpdate(
                        reviewObjectId,
                        { $inc: { upvoteCount: 1, downvoteCount: -1 } },
                        { new: true }
                    );
                } else {
                    updatedReview = await Review.findByIdAndUpdate(
                        reviewObjectId,
                        { $inc: { upvoteCount: -1, downvoteCount: 1 } },
                        { new: true }
                    );
                }

                if (global.io) {
                    global.io.emit('voteUpdated', { reviewId: reviewId });
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
            console.log(`Creating new vote: reviewId=${reviewId}, userId=${userId}, voteType=${voteType}`);
            const newVote = new Vote({
                reviewId: reviewObjectId,
                userId: userObjectId,
                voteType
            });
            await newVote.save();
            console.log(`New vote created: ${newVote._id}`);

            if (voteType === 'up') {
                updatedReview = await Review.findByIdAndUpdate(
                    reviewObjectId,
                    { $inc: { upvoteCount: 1 } },
                    { new: true }
                );
            } else {
                updatedReview = await Review.findByIdAndUpdate(
                    reviewObjectId,
                    { $inc: { downvoteCount: 1 } },
                    { new: true }
                );
            }
            
            if (global.io) {
                global.io.emit('voteUpdated', { reviewId: reviewId });
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
        console.error("Vote processing error:", err);
        res.status(500).json({
            success: false,
            error: "Server error",
            details: err.message
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