const Vote = require('../database/models/models').Vote;
const Review = require('../database/models/models').Review;

exports.vote = async (req, res) => {
    try {
        const { reviewId, userId, voteType } = req.body;

        if (!reviewId || !userId || !voteType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (voteType !== 'up' && voteType !== 'down') {
            return res.status(400).json({ error: "Vote type must be 'up' or 'down'" });
        }

        const existingVote = await Vote.findOne({ reviewId, userId });

        if (existingVote) {
            if (existingVote.voteType === voteType) {
                await Vote.deleteOne({ _id: existingVote._id });

                if (voteType === 'up') {
                    await Review.findByIdAndUpdate(reviewId, { $inc: { upvoteCount: -1 } });
                } else {
                    await Review.findByIdAndUpdate(reviewId, { $inc: { downvoteCount: -1 } });
                }

                return res.json({ message: "Vote removed" });
            } else {
                existingVote.voteType = voteType;
                await existingVote.save();

                if (voteType === 'up') {
                    await Review.findByIdAndUpdate(reviewId, {
                        $inc: { upvoteCount: 1, downvoteCount: -1 }
                    });
                } else {
                    await Review.findByIdAndUpdate(reviewId, {
                        $inc: { upvoteCount: -1, downvoteCount: 1 }
                    });
                }

                return res.json({ message: "Vote updated" });
            }
        } else {
            const newVote = new Vote({
                reviewId,
                userId,
                voteType
            });

            await newVote.save();

            if (voteType === 'up') {
                await Review.findByIdAndUpdate(reviewId, { $inc: { upvoteCount: 1 } });
            } else {
                await Review.findByIdAndUpdate(reviewId, { $inc: { downvoteCount: 1 } });
            }

            return res.json({ message: "Vote recorded" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
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

        return res.json({ message: "Vote recorded" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

exports.voteOwnerResponse = async (req, res) => {
    try {
        console.log("Received vote request:", req.body); // 🔍 Log incoming request

        const { reviewId, userId, voteType } = req.body;

        if (!reviewId || !userId || !voteType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (voteType !== 'up' && voteType !== 'down') {
            return res.status(400).json({ error: "Vote type must be 'up' or 'down'" });
        }

        const review = await Review.findById(reviewId);
        if (!review || !review.ownerResponse) {
            return res.status(404).json({ error: "Review or owner response not found" });
        }

        console.log("Review found, processing vote...");

        let existingVote = await Vote.findOne({ reviewId, userId, voteOn: "ownerResponse" });

        if (existingVote) {
            console.log("Existing vote found:", existingVote);
            if (existingVote.voteType === voteType) {
                await Vote.deleteOne({ _id: existingVote._id });
                if (voteType === 'up') {
                    review.ownerResponse.upvoteCount--;
                } else {
                    review.ownerResponse.downvoteCount--;
                }
            } else {
                existingVote.voteType = voteType;
                await existingVote.save();
                if (voteType === 'up') {
                    review.ownerResponse.upvoteCount++;
                    review.ownerResponse.downvoteCount--;
                } else {
                    review.ownerResponse.upvoteCount--;
                    review.ownerResponse.downvoteCount++;
                }
            }
        } else {
            console.log("Creating new vote...");
            const newVote = new Vote({ reviewId, userId, voteType, voteOn: "ownerResponse" });
            await newVote.save();

            if (voteType === 'up') {
                review.ownerResponse.upvoteCount++;
            } else {
                review.ownerResponse.downvoteCount++;
            }
        }

        await review.save();

        console.log("Vote updated, emitting WebSocket event...");
        global.io.emit('ownerResponseVoted', {
            reviewId,
            upvotes: review.ownerResponse.upvoteCount,
            downvotes: review.ownerResponse.downvoteCount
        });

        return res.json({ message: "Vote recorded", upvotes: review.ownerResponse.upvoteCount, downvotes: review.ownerResponse.downvoteCount });
    } catch (err) {
        console.error("Error in voteOwnerResponse:", err);
        return res.status(500).json({ error: "Server error", details: err.message });
    }
};
