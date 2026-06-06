const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('LocalChefBazaar Server is Running');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


const { MongoClient, ServerApiVersion } = require('mongodb');
//const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.khmigmu.mongodb.net/?appName=Cluster1`;
//const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.khmigmu.mongodb.net/localchef?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.khmigmu.mongodb.net/LocalChefBazaar?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        req.user = decoded; // ডিকোড হওয়া ইমেইল রিকোয়েস্টে সেট করে দেওয়া হলো
        next(); // সব ঠিক থাকলে পরের ফাংশনে যেতে দেবে
    });
};
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// Middleware to verify if the user is a Chef
const verifyChef = async (req, res, next) => {
    const email = req.user.email;
    const query = { email: email };
    const user = await db.collection("users").findOne(query);
    const isChef = user?.role === 'chef';
    if (!isChef) {
        return res.status(403).send({ message: 'Forbidden access! Chefs only.' });
    }
    next();
};

// Middleware to verify if the user is an Admin
const verifyAdmin = async (req, res, next) => {
    const email = req.user.email;
    const query = { email: email };
    const user = await db.collection("users").findOne(query);
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden access! Admins only.' });
    }
    next();
};

// --- API Route to get specific user's role ---
app.get('/user/role/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
    if (email !== req.user.email) {
        return res.status(403).send({ message: 'Forbidden access' });
    }
    const query = { email: email };
    const user = await db.collection("users").findOne(query);
    res.send({ role: user?.role || 'user' });
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
  app.post('/jwt', async (req, res) => {
    const user = req.body; // ফ্রন্টএন্ড থেকে পাঠানো ইউজারের ইমেইল
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' }); // ৭ দিনের মেয়াদ

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // লোকাল হোস্টে false, লাইভে গেলে true
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    })
    .send({ success: true });
});
app.post('/logout', async (req, res) => {
    res.clearCookie('token', {
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    })
    .send({ success: true });
});
// Get all meals with pagination and sorting
app.get('/meals', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Challenge Task: 10 items per page
        const skip = (page - 1) * limit;
        
        // Sorting logic (high-to-low ba low-to-high)
        const sortQuery = req.query.sort;
        let sortOption = {};
        if (sortQuery === 'asc') {
            sortOption = { price: 1 }; // Low to High
        } else if (sortQuery === 'desc') {
            sortOption = { price: -1 }; // High to Low
        }

        // Database theke filtered data niye asa
        const result = await mealsCollection.find()
            .skip(skip)
            .limit(limit)
            .sort(sortOption)
            .toArray();

        // Total meals count (Frontend-e pagination button-er jonno lagbe)
        const totalMeals = await mealsCollection.countDocuments();

        res.send({
            meals: result,
            totalMeals,
            totalPages: Math.ceil(totalMeals / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});
// 1. Get a single meal details by ID
app.get('/meal/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await mealsCollection.findOne(query);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// 2. Post a review for a meal (Private - code standard verifyToken use kora hoyeche)
app.post('/reviews', verifyToken, async (req, res) => {
    try {
        const review = req.body;
        // reviewsCollection create hobe dynamically
        const result = await db.collection("reviews").insertOne(review);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// 3. Get reviews for a specific meal
app.get('/reviews/:mealId', async (req, res) => {
    try {
        const mealId = req.params.mealId;
        const query = { mealId: mealId };
        const result = await db.collection("reviews").find(query).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});
app.post('/create-payment-intent', verifyToken, async (req, res) => {
    try {
        const { price } = req.body;
        const amount = parseInt(price * 100); // Stripe poisar calculation handle kore (cents)

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'bdt', // ba usd use korte paris testing sandbox layout mapping anushare
            payment_method_types: ['card']
        });

        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// 2. Save Payment & Order Info Route (Private)
app.post('/orders', verifyToken, async (req, res) => {
    try {
        const orderData = req.body;
        const result = await db.collection("orders").insertOne(orderData);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// 3. Get Logged-in User's Orders
app.get('/my-orders', verifyToken, async (req, res) => {
    try {
        const email = req.user.email;
        const result = await db.collection("orders").find({ userEmail: email }).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

}
run().catch(console.dir);
