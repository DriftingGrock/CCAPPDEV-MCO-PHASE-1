const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI; // use MONGO_URI from .env

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public directry

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));
/*
honestly, not sure if that should be used, or remove dotenv and use
mongoose.connect('mongodb://localhost/galleryDB')
 */

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
app.get('/restoProfiles/:resto', (req, res) => {
    res.sendFile(path.join(__dirname, `views/HTML/restoProfiles/${resto}.html`));
});
app.get('/userProfiles/:user', (req, res) => {
    res.sendFile(path.join(__dirname, `views/HTML/userProfiles/${user}.html`));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});