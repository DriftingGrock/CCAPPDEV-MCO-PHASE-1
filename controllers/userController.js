const mongoose = require('mongoose');
const User = require('../database/models/models').User;
const Establishment = require('../database/models/models').Establishment;
const Vote = require('../database/models/models').Vote; // Add this line
const bcrypt = require('bcrypt');
const saltRounds = 10;

exports.createUser = async (req, res) => {
    try {
        const { username, password, bio } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).send('Username and password are required');
        }

        // Add role selection logic if needed, default to 'reviewer' for now
        const role = 'reviewer';

        // Check if username already exists
        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already taken" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            username: username,
            password: hashedPassword,
            bio: bio,
            role: role,
            // avatar: Handle avatar path if uploaded
        });

        await newUser.save();

        // Automatically log the user in after signup
        req.session.userId = newUser._id;
        req.session.username = newUser.username;
        req.session.role = newUser.role;

        req.session.save(err => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ error: "Session error" });
            }
            res.redirect('/userProfile/' + newUser._id);
        });

    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ error: "Server Error during signup" });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const loggedInUserId = req.session.userId ? new mongoose.Types.ObjectId(req.session.userId) : null;
        let profileOwnerId;

        // Validate the profile owner ID format before creating ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.params.user)) {
            return res.status(400).send('Invalid User ID format');
        }
        profileOwnerId = new mongoose.Types.ObjectId(req.params.user);

        const isOwner = loggedInUserId && loggedInUserId.equals(profileOwnerId);

        // Fetch user and populate reviews
        const user = await User.findById(profileOwnerId)
            .populate({
                path: 'reviews', // Populate the reviews array field in the User schema
                options: { sort: { createdAt: -1 } },
                populate: [ // Nested population within each review
                    { path: 'establishmentId', select: 'name _id' },
                    { path: 'ownerResponse.ownerId', select: 'username avatar' }, // Assuming ownerResponse structure might change, adjust if needed
                    { path: 'userId', select: 'username avatar _id' } // Populating the user who wrote the review (should be the profile owner)
                ]
            })
            .lean(); // Use .lean() for plain JS objects

        if (!user) {
            return res.status(404).send('User not found');
        }


        if (user.avatar === "") {
            user.avatar = "/images/user_profile/defaultDP.png";
        }

        // --- Reputation Calculation Start ---
        let calculatedReputation = 0;
        if (user.reviews && user.reviews.length > 0) {
            for (const review of user.reviews) {
                // Ensure upvoteCount and downvoteCount exist and are numbers
                const upvotes = typeof review.upvoteCount === 'number' ? review.upvoteCount : 0;
                const downvotes = typeof review.downvoteCount === 'number' ? review.downvoteCount : 0;
                calculatedReputation += (upvotes - downvotes);
            }
        }
        // Add the calculated reputation to the user object passed to the template.
        // Note: This does NOT update the database field user.stats.reputation.
        // It's calculated dynamically for display on this page load.
        user.stats.reputation = calculatedReputation;
        // --- Reputation Calculation End ---


        // Add ownership flag to each review
        if (user.reviews && user.reviews.length > 0) {
            user.reviews = user.reviews.map(review => {
                // Check if review.userId exists and is populated correctly
                const isReviewOwner = loggedInUserId && review.userId && loggedInUserId.equals(review.userId._id);
                // Defensive check: Ensure the review being processed actually belongs to the profile owner
                // This should always be true because we populated user.reviews, but belt-and-suspenders.
                if (!review.userId || !profileOwnerId.equals(review.userId._id)) {
                    console.warn(`Review ${review._id} found in user ${profileOwnerId}'s profile does not belong to them? Actual owner: ${review.userId?._id}`);
                    // Decide how to handle this - skip? still show? For now, we include it but flag ownership based on loggedInUser
                }
                return { ...review, isReviewOwner: isReviewOwner };
            });
        }

        // Add userVote status to each review if a user is logged in
        if (loggedInUserId && user.reviews) { // Check user.reviews exists
            for (const review of user.reviews) { // No need for || [] if checked above
                const userVote = await Vote.findOne({
                    reviewId: review._id,
                    userId: loggedInUserId
                }).lean();

                review.userVote = userVote ? userVote.voteType : null;
            }
        }

        // Calculate rating distribution
        const ratingCounts = [0, 0, 0, 0, 0];
        const userReviews = user.reviews || []; // Use the potentially modified user.reviews array

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

        // Render the profile page
        res.render('userProfile', {
            user: user, // The user object now contains 'calculatedReputation'
            isOwner: isOwner,
            userRatingData,
            totalUserRatings,
            loggedInUser: req.session.userId ? req.session.userId.toString() : null // Pass loggedInUserId as string or null
        });

    } catch (err) {
        console.error("Error fetching user profile:", err);
        // Check specifically for CastError (invalid ObjectId format) before other errors
        if (err.name === 'CastError' && err.path === '_id') { // Check if the CastError is related to the ID
            return res.status(400).send('Invalid User ID format');
        }
        res.status(500).send('Server Error');
    }
};

exports.editUserProfile = async (req, res) => {
    try {
        // Verify the user is editing their own profile
        if (req.params.user !== req.session.userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { name, bio } = req.body;
        const userId = req.params.user;
        let updateFields = { username: name, bio };

        if (req.file) {
            const avatarPath = '/uploads/' + req.file.filename;
            updateFields.avatar = avatarPath;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateFields,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            avatarUrl: updatedUser.avatar || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Create session
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.role = user.role;

        // Save session
        req.session.save(err => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ error: "Session error" });
            }
            res.json({
                success: true,
                userId: user._id,
                redirectUrl: '/userProfile/' + user._id
            });
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server Error during login" });
    }
};

exports.logoutUser = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Logout Error:", err);
            return res.status(500).json({ error: "Could not log out" });
        }

        // Clear the cookie
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
};