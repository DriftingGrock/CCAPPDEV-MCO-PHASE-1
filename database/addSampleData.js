const mongoose = require('mongoose');
const { User, Establishment, Review, Menu, Photo } = require('./models/models');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('✅ MongoDB connected');

        // Clean existing data (optional)
        await Establishment.deleteMany({});
        await Review.deleteMany({});
        await User.deleteMany({});
        await Menu.deleteMany({});
        await Photo.deleteMany({});

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
        console.log('✅ Establishment created:', establishment);

        // Step 2: Insert User (without reviews for now)
        const user = new User({
            username: "Anthony",
            password: "securepassword123", // In production, hash passwords
            avatar: "/images/user_profile/Anthony.png",
            bio: "Certified Critic - Do not argue against me, you will lose.",
            role: 'reviewer',
            stats: {
                reviewsMade: 2,
                reputation: 1500000
            },
            reviews: [] // Will be updated later
        });
        await user.save();
        console.log('✅ User created:', user);

        // Step 3: Insert Reviews and Reference IDs
        const reviews = [
            {
                establishmentId: establishment._id,
                userId: user._id,
                body: "New flavor, it is not snow cheese.",
                rating: 3,
                edited: true,
                ownerResponse: {
                    ownerId: user._id,
                    body: "Thank you for the feedback!",
                    media: ["/images/owner_response/response1.png"],
                    upvoteCount: 5,
                    downvoteCount: 1,
                    edited: false,
                }
            },
            {
                establishmentId: establishment._id,
                userId: user._id,
                body: "Very delicious, would go back.",
                rating: 4,
                edited: false
            }
        ];

        const savedReviews = await Review.insertMany(reviews);
        console.log('✅ Reviews created:', savedReviews);

        // Step 4: Update User and Establishment with Review IDs
        user.reviews = savedReviews.map(review => review._id);
        await user.save();

        establishment.reviews = savedReviews.map(review => review._id);
        await establishment.save();

        // Step 5: Insert Sample Menu (Optional)
        const menu = await Menu.create({
            establishmentId: establishment._id,
            items: [
                {
                    name: 'Snow Cheese Chicken',
                    description: 'Boneless chicken topped with cheese powder',
                    price: 450,
                    image: '/images/menu/snow_cheese.jpg'
                },
                {
                    name: 'Yangnyeom Chicken',
                    description: 'Sweet and spicy Korean-style fried chicken',
                    price: 400,
                    image: '/images/menu/yangnyeom.jpg'
                }
            ]
        });
        console.log('✅ Menu created:', menu);

        // Step 6: Insert Sample Photos (Optional)
        const photos = await Photo.insertMany([
            {
                establishmentId: establishment._id,
                imageUrl: '/images/gallery/24chicken1.jpg',
                uploadedBy: user._id
            },
            {
                establishmentId: establishment._id,
                imageUrl: '/images/gallery/24chicken2.jpg',
                uploadedBy: user._id
            }
        ]);
        console.log('✅ Photos created:', photos);

        console.log('✅ All data inserted successfully');
        mongoose.disconnect();
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));
