const mongoose = require('mongoose');
const { User, Establishment, Review } = require('./models/models');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('MongoDB connected');

        // Step 1: Insert Establishment
        const establishment = new Establishment({
            name: "24 Chicken",
            description: "24Chicken – Crispy, Flavorful, and Always Ready! 🍗🔥",
            address: "1198 Nearby Street, Taft",
            phone: "6666 123 1217",
            openingHours: "Open 1:00pm - 1:00am",
            priceRange: "₱400 for 5",
            cuisine: "Boneless Chicken",
            overallRating: 1.0,
            menu: ["/images/resto_menu/24Chicken.png"],
            photos: ["/images/image_gallery/24chicken_sweetcorn.jpg"],
            bannerImage: "/images/resto_banner/24chicken_banner.jpg"
        });

        await establishment.save();
        console.log('Establishment created:', establishment);

        // Step 2: Insert User (without reviews for now)
        const user = new User({
            username: "Anthony",
            password: "securepassword123", // In production, hash passwords
            avatar: "/images/user_profile/Anthony.png",
            bio: "Certified Critic- Do not argue against me, you will lose.",
            role: 'reviewer',
            stats: {
                reviewsMade: 2,
                reputation: 1500000
            },
            reviews: [] // Will be updated later
        });

        await user.save();
        console.log('User created:', user);

        // Step 3: Insert Reviews and Reference IDs
        const reviews = [
            {
                establishmentId: establishment._id,
                userId: user._id,
                title: "Not Snow Cheese",
                body: "New flavor, it is not snow cheese.",
                rating: 3,
                edited: true
            },
            {
                establishmentId: establishment._id,
                userId: user._id,
                title: "Very Delicious",
                body: "Very delicious, would go back.",
                rating: 4,
                edited: false
            }
        ];

        const savedReviews = await Review.insertMany(reviews);
        console.log('Reviews created:', savedReviews);

        // Step 4: Update User and Establishment with Review IDs
        user.reviews = savedReviews.map(review => review._id);
        await user.save();

        establishment.reviews = savedReviews.map(review => review._id);
        await establishment.save();

        console.log("User and Establishment updated with reviews.");
        mongoose.disconnect();
    })
    .catch(err => console.log('MongoDB connection error:', err));
