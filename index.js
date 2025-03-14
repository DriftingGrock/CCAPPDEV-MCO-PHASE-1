const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const hbs = require('hbs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
*/
app.get('/restoList', async (req, res) => {
    try {
        const establishments = await Establishment.find().lean();
        res.render('restoList', { establishments });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/sign-up', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/HTML/sign-up.html'));
});
/* old bea code
app.get('/restoProfiles/:resto', (req, res) => {
    res.sendFile(path.join(__dirname, `views/HTML/restoProfiles/${resto}.html`));
});
*/
const { Establishment, Review, User, Menu, Photo } = require('./database/models/models');

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
                populate: [
                    {
                        path: 'establishmentId',
                        select: 'name bannerImage'
                    },
                    {
                        path: 'ownerResponse.ownerId',
                        select: 'username avatar'
                    }, {
                        path: 'establishmentId',
                        select: 'name'
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
        res.render('userProfile', { user, ownedEstablishments });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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