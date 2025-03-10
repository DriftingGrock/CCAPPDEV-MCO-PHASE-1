const mongoose = require('mongoose');

// The following codes were generated with the help of AI
// Reviewed and modified by humans! to fit our project.


// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: String,
    description: String,
    role: { type: String, enum: ['reviewer', 'establishment_owner'], required: true },
    establishmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Establishment Schema
const establishmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    location: String,
    overallRating: Number,
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Review Schema
const reviewSchema = new mongoose.Schema({
    establishmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    media: [String],
    upvoteCount: { type: Number, default: 0 },
    downvoteCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    edited: { type: Boolean, default: false },
    ownerResponse: {
        response: String,
        respondedAt: Date
    }
});

// Comment Schema (included here is the Establishment Owner's response)
const commentSchema = new mongoose.Schema({
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    edited: { type: Boolean, default: false }
});

// Up/Down Vote Schema
const voteSchema = new mongoose.Schema({
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    voteType: { type: String, enum: ['up', 'down'], required: true },
    createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Establishment = mongoose.model('Establishment', establishmentSchema);
const Review = mongoose.model('Review', reviewSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Vote = mongoose.model('Vote', voteSchema);

module.exports = { User, Establishment, Review, Comment, Vote };