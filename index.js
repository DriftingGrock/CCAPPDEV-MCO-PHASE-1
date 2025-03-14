const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const hbs = require('hbs');

const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // Ensure it defaults to 3000 if PORT is undefined

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));
//old bea code const MONGO_URI = process.env.MONGO_URI; // use MONGO_URI from .env

// Set up Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

hbs.registerHelper('multiply', (a, b) => a * b);
hbs.registerHelper('gt', (a, b) => a > b);

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public directry
app.use('/images', express.static('public/images'));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Routes
// const establishmentRoutes = require('./controllers/establishmentController');
// app.use('/api', establishmentRoutes);

// Serve HTML files from views/HTML
/*
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/HTML/index.html'));
});
*/
app.get('/', async (req, res) => {
    try {
        // Get top 5 rated restaurants
        const recommendedEstablishments = await Establishment.find()
            .sort({ overallRating: -1 })
            .limit(5)
            .lean();

        // Get 5 most recent reviews with populated restaurant & user
        const recentReviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('establishmentId', 'name bannerImage')
            .populate('userId', 'username')
            .lean();

        res.render('index', { recommendedEstablishments, recentReviews });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


/* The other links....
app.get('/restoList', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/HTML/restoList.html'));
});

app.get('/restoList', async (req, res) => {
    try {
        const establishments = await Establishment.find().lean();
        res.render('restoList', { establishments });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
*/
app.get('/restoList', async (req, res) => {
    try {
        let matchQuery = {}; // Default: no filters
        let sortOption = {}; // Default: no sorting

        // 🔎 Handle Search Query
        if (req.query.search) {
            const searchTerm = req.query.search.trim();
            matchQuery = {
                $or: [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } }
                ]
            };
        }

        // 📌 Handle Sorting
        switch (req.query.sort) {
            case 'best': 
                sortOption = { overallRating: -1 }; // Highest rating first
                break;
            case 'most': 
                sortOption = { numReviews: -1 }; // Most ratings first
                break;
            case 'recent': 
                sortOption = { updatedAt: -1 }; // Recently reviewed first
                break;
            default:
                sortOption = { name: 1 }; // Default: Alphabetical order
        }

        // 🔄 Fetch establishments using MongoDB aggregation
        const establishments = await Establishment.aggregate([
            { $match: matchQuery }, // Apply search filter
            { $addFields: { numReviews: { $size: "$reviews" } } }, // Count number of reviews
            { $sort: sortOption } // Apply sorting
        ]);

        res.render('restoList', { establishments });
    } catch (error) {
        console.error("Error in /restoList:", error);
        res.status(500).send('Server Error');
    }
});


app.get('/sign-up', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/HTML/sign-up.html'));
});
/*
RESTOPROFILES SECTION ===============================================================================
/* old bea code
app.get('/restoProfiles/:resto', (req, res) => {
    res.sendFile(path.join(__dirname, `views/HTML/restoProfiles/${resto}.html`));
});
*/
const { Establishment, Review, User, Menu, Photo, Vote } = require('./database/models/models');

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


app.get('/restoProfile/:id', async (req, res) => {
    try {
        const establishment = await Establishment.findById(req.params.id)
            .populate({
                path: 'reviews',
                populate: { path: 'userId', select: 'username avatar' }
            })
            .lean();

        const menu = await Menu.findOne({ establishmentId: req.params.id }).lean();
        const photos = await Photo.find({ establishmentId: req.params.id }).lean();

        if (!establishment) {
            return res.status(404).send('Establishment not found');
        }

        // Extract rating data
        const { ratingData, averageRating, totalRatings } = getRatingData(establishment.reviews);

        res.render('restoProfile', {
            establishment,
            menu,
            photos,
            ratingData,
            averageRating,   // ✅ Include averageRating
            totalRatings     // ✅ Include totalRatings
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

const multer = require("multer");
const upload = multer({ dest: "public/uploads/" });

// Default user function
async function getDefaultUser() {
    try {
        const defaultUser = await User.findOne(); // Get the first user in the database
        if (!defaultUser) {
            console.error("No default user found in the database.");
            return null;
        }
        return defaultUser;
    } catch (error) {
        console.error("Error fetching default user:", error);
        return null;
    }
}

app.post("/api/reviews", upload.array("media"), async (req, res) => {
    try {
        console.log("Incoming review request:", req.body);

        const { establishmentId, title, body, rating } = req.body;

        if (!establishmentId || !title || !body || !rating) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!establishmentId || !body || !rating) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const defaultUser = await User.findOne();
        if (!defaultUser) {
            return res.status(500).json({ error: "No default user found. Please add a user to the database." });
        }

        let mediaUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const newReview = new Review({
            establishmentId,
            userId: defaultUser._id,
            username: defaultUser.username,
            title,  // ✅ Add title field here
            body,
            rating,
            media: mediaUrls
        });

        await newReview.save();
        await Establishment.findByIdAndUpdate(establishmentId, { $push: { reviews: newReview._id } });

        console.log("Review posted successfully:", newReview);
        res.status(201).json({ message: "Review posted successfully", review: newReview });
    } catch (err) {
        console.error("Error posting review:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});



// Fetch reviews for a restaurant
app.get("/api/reviews/:establishmentId", async (req, res) => {
    try {
        const reviews = await Review.find({ establishmentId: req.params.establishmentId })
            .populate("userId", "username avatar")
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/*
USER PROFILES SECTION ===============================================================================

All functions related are seen below this comment:
- fetching user data from database
 */
app.get('/userProfile/:user', async (req, res) => {
    try {
        // Fetch the user's profile data (to be handed to userProfile.hbs)
        const user = await User.findById(req.params.user)
            .populate({
                path: 'reviews',
                populate: [         // the ff. are needed for displaying review (relating ID to other collections)
                    {
                        path: 'establishmentId',
                        select: 'name'
                    },
                    {
                        path: 'ownerResponse.ownerId',
                        select: 'username avatar'
                    }, {
                        path: 'establishmentId',
                        select: 'name'
                    }, {
                        path: 'userId',
                        select: 'username avatar'
                    }
                ]
            })
            .lean();

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch establishments owned by the user (if applicable)
        const ownedEstablishments = await Establishment.find({ ownerId: req.params.user }).lean();

        // Render the user profile page with the fetched data
		// Calculate rating distribution for the user's reviews
		const ratingCounts = [0, 0, 0, 0, 0]; // Index 0 = 1-star, Index 4 = 5-star
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

		// Add this data to what we pass to the template
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
});

app.post('/userProfile/:user/edit', upload.single('avatar'), async (req, res) => {
    try {
        const { name, bio } = req.body;
        const userId = req.params.user; // Get user ID from the URL parameter
        let updateFields = { username: name, bio };

        // Handle avatar upload
        if (req.file) {
            const avatarPath = `/uploads/${req.file.filename}`; // Path for frontend
            updateFields.avatar = avatarPath;
        }

        // Update user in database
        const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });

        res.json({
            success: true,
            avatarUrl: updatedUser.avatar || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/*
	Claude's own implementation of routing!
	-- Gideon on upvotes.
*/
// Vote on a review (upvote/downvote)
app.post("/api/vote", async (req, res) => {
    try {
        const { reviewId, userId, voteType } = req.body;
        
        if (!reviewId || !userId || !voteType) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        if (voteType !== 'up' && voteType !== 'down') {
            return res.status(400).json({ error: "Vote type must be 'up' or 'down'" });
        }
        
        // Check if user has already voted on this review
        const existingVote = await Vote.findOne({ reviewId, userId });
        
        if (existingVote) {
            // User has already voted, check if they're changing their vote
            if (existingVote.voteType === voteType) {
                // User is clicking the same vote type - remove their vote
                await Vote.deleteOne({ _id: existingVote._id });
                
                // Update the review counts
                if (voteType === 'up') {
                    await Review.findByIdAndUpdate(reviewId, { $inc: { upvoteCount: -1 } });
                } else {
                    await Review.findByIdAndUpdate(reviewId, { $inc: { downvoteCount: -1 } });
                }
                
                return res.json({ message: "Vote removed" });
            } else {
                // User is changing their vote (up to down or down to up)
                existingVote.voteType = voteType;
                await existingVote.save();
                
                // Update the review counts
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
            // New vote
            const newVote = new Vote({
                reviewId,
                userId,
                voteType
            });
            
            await newVote.save();
            
            // Update the review count
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
});

// Get user's votes for a specific establishment (to highlight which reviews the user has voted on)
app.get("/api/votes/:userId/:establishmentId", async (req, res) => {
    try {
        const { userId, establishmentId } = req.params;
        
        // Find all reviews for this establishment
        const reviews = await Review.find({ establishmentId });
        const reviewIds = reviews.map(review => review._id);
        
        // Find all votes by this user for these reviews
        const votes = await Vote.find({
            userId,
            reviewId: { $in: reviewIds }
        });
        
        // Format as a map for easy frontend lookup
        const voteMap = {};
        votes.forEach(vote => {
            voteMap[vote.reviewId] = vote.voteType;
        });
        
        res.json(voteMap);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Simplified vote API that doesn't require user authentication
app.post("/api/vote-simple", async (req, res) => {
    try {
        const { reviewId, voteType } = req.body;
        
        if (!reviewId || !voteType) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        if (voteType !== 'up' && voteType !== 'down') {
            return res.status(400).json({ error: "Vote type must be 'up' or 'down'" });
        }
        
        // Simply update the count without tracking user
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
});


/*
HELPER FUNCTIONS ===============================================================================

- Date formatting
    handlebar: {{formatDate this.createdAt}}
    formatted: Jul 9, 2020 7:59 PM
 */
hbs.registerHelper('formatDate', function (date) {
    if (!date) return ''; // Handle cases where date is null or undefined

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true, // Use 12-hour format (AM/PM)
    };

    // Format the date using Intl.DateTimeFormat
    return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});