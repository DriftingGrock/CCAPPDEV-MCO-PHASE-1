const User = require('../database/models/models').User;
const Establishment = require('../database/models/models').Establishment;
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
            .select("username avatar bio stats.reviewsMade")
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
            totalUserRatings,
            isLoggedIn: !!req.session.userId,
            currentUser: req.session.userId
        });
    } catch (err) {
        console.error(err);
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