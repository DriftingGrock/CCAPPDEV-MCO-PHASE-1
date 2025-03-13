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

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public directry



// Routes
// const establishmentRoutes = require('./controllers/establishmentController');
// app.use('/api', establishmentRoutes);

// Serve HTML files from views/HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/HTML/index.html'));
});

// The other links....
app.get('/restoList', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/HTML/restoList.html'));
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

app.get('/restoProfile/:id', async (req, res) => {
    try {
        const establishment = await Establishment.findById(req.params.id)
            .populate({
                path: 'reviews',
                populate: [
                    {
                        path: 'userId',
                        select: 'username avatar'
                    },
                    {
                        path: 'ownerResponse.ownerId',
                        select: 'username avatar'
                    }
                ]
            })
            .lean();

        const menu = await Menu.findOne({ establishmentId: req.params.id }).lean();
        const photos = await Photo.find({ establishmentId: req.params.id }).lean();

        if (!establishment) {
            return res.status(404).send('Establishment not found');
        }

        res.render('restoProfile', { establishment, menu, photos });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


app.get('/userProfiles/:user', (req, res) => {
    res.sendFile(path.join(__dirname, `views/HTML/userProfiles/${user}.html`));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});