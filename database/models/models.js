const mongoose = require('mongoose');

// The following codes were generated with the help of AI
// Reviewed and modified by humans! to fit our project.


// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: String, // Profile picture URL
    bio: String, // User bio
    role: { type: String, enum: ['reviewer', 'establishment_owner'], required: true },
    establishmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment' }, // For establishment owners
    stats: {
        reviewsMade: { type: Number, default: 0 },
        reputation: { type: Number, default: 0 }
    },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }], // Reviews made by the user
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Establishment Schema
const establishmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String, // General description of the establishment
    address: String, // Physical address
    phone: String, // Contact number
    openingHours: String, // Opening hours (e.g., "1:00pm - 1:00am")
    priceRange: String, // Price range (e.g., "₱400 for 5")
    cuisine: String, // Type of cuisine (e.g., "Boneless Chicken")
    overallRating: Number, // Average rating
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }], // Reviews for this establishment
    menu: [String], // URLs to menu images
    photos: [String], // URLs to gallery images
    bannerImage: String, // URL to the banner image
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
// Review Schema
const reviewSchema = new mongoose.Schema({
    establishmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true }, // Review text
    rating: { type: Number, required: true, min: 1, max: 5 }, // Rating (1-5 stars)
    media: [String], // URLs to attached images/videos
    upvoteCount: { type: Number, default: 0 }, // Number of upvotes
    downvoteCount: { type: Number, default: 0 }, // Number of downvotes
    edited: { type: Boolean, default: false }, // Indicates if the review was edited
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    ownerResponse: { type: mongoose.Schema.Types.Mixed, default: null } // Initialize to null
    // ownerResponse: { // Response from the establishment owner
    //     ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' /*, required: true*/ },
    //     body: String,
    //     media: [String], // URLs to attached images/videos
    //     upvoteCount: { type: Number, default: 0 }, // Number of upvotes
    //     downvoteCount: { type: Number, default: 0 }, // Number of downvotes
    //     edited: { type: Boolean, default: false }, // Indicates if the review was edited
    //     createdAt: { type: Date, default: Date.now },
    //     updatedAt: { type: Date, default: Date.now }
    // }
});

// Up/Down Vote Schema
const voteSchema = new mongoose.Schema({
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    voteType: { type: String, enum: ['up', 'down'], required: true },
    createdAt: { type: Date, default: Date.now }
});


// Will-think-about/consider Schema
// Menu Schema (Optional)
const menuSchema = new mongoose.Schema({
    establishmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
    items: [
        {
            name: String,
            description: String,
            price: Number,
            image: String
        }
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Photo Schema (Optional)
const photoSchema = new mongoose.Schema({
    establishmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
    imageUrl: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Establishment = mongoose.model('Establishment', establishmentSchema);
const Review = mongoose.model('Review', reviewSchema);
//const Comment = mongoose.model('Comment', commentSchema);
const Vote = mongoose.model('Vote', voteSchema);
const Menu = mongoose.model('Menu', menuSchema);
const Photo = mongoose.model('Photo', photoSchema);


module.exports = { User, Establishment, Review,  Vote, Menu, Photo };