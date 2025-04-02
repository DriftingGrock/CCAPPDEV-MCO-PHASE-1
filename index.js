const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const hbs = require('hbs');
const multer = require('multer');
const upload = multer({ dest: "public/uploads/" });

const bcrypt = require('bcrypt');
const session = require('express-session');
const User = require('./database/models/models').User; // Ensure User model is required if not already global
const saltRounds = 10; // For bcrypt hashing

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI) 
    .then(() => console.log('MongoDB connected successfully via MONGO_URI'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); //exit if DB connection fails
    });

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

hbs.registerHelper('multiply', (a, b) => a * b);
hbs.registerHelper('gt', (a, b) => a > b);
hbs.registerHelper('formatDate', function (date) {
    if (!date) return '';
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
    };
    return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
});
hbs.registerHelper('eq', function (a, b) {
    return a === b;
});


app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static('public/images'));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// For parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); 

app.use(session({
    secret: process.env.SESSION_SECRET || 'a_default_fallback_secret_key', // Use an environment variable for the secret
    resave: false,
    saveUninitialized: false, 
    cookie: { secure: process.env.NODE_ENV === 'production' } // Use secure cookies in production (requires HTTPS)
}));

//middleware for templates to receive login status
app.use((req, res, next) => {
    res.locals.isLoggedIn = !!req.session.userId;
    res.locals.currentUser = req.session.userId;
    next();
});
// route protection
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    next();
};



// Controllers
const establishmentController = require('./controllers/establishmentController');
const reviewController = require('./controllers/reviewController');
const userController = require('./controllers/userController');
const voteController = require('./controllers/voteController');

// Routes
app.get('/', establishmentController.getHomePage);
app.get('/restoList', establishmentController.getRestoList);
app.get('/restoProfile/:id', establishmentController.getRestoProfile);
app.get('/restoProfile/:id/owner', establishmentController.getRestoProfileOwner);
app.post('/restoProfile/:id/edit', upload.single('banner'), establishmentController.editRestoProfile);
app.post('/api/reviews/:reviewId/reply', establishmentController.replyToReview);

app.post("/api/reviews", upload.array("media"), reviewController.postReview);
app.get("/api/reviews/:establishmentId", reviewController.getReviews);
app.post("/edit-review/:id", reviewController.editReview);
app.delete("/delete-review/:id", reviewController.deleteReview);

app.post("/edit-reply/:id", reviewController.editReply);
app.delete("/delete-reply/:id", reviewController.deleteReply);

app.get('/userProfile/:user', userController.getUserProfile);
app.post('/userProfile/:user/edit', upload.single('avatar'), userController.editUserProfile);

app.post("/api/vote", voteController.vote);
app.get("/api/votes/:userId/:establishmentId", voteController.getVotes);
app.post("/api/vote-simple", voteController.voteSimple);

// Add this route definition in index.js
app.get('/sign-up', (req, res) => {
    // Send the sign-up.html file
    // Make sure the path is correct relative to index.js
    res.sendFile(path.join(__dirname, 'views', 'html', 'sign-up.html'));
});
app.post('/signup', userController.createUser); // Point to a new controller function
app.post('/login', userController.loginUser);
app.post('/logout', userController.logoutUser); // Or use GET method
/*
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});
*/

const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});

// ✅ Attach to global object instead of module.exports
global.io = io;



