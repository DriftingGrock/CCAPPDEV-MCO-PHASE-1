const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const hbs = require('hbs');
const multer = require('multer');
const upload = multer({ dest: "public/uploads/" });

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

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



