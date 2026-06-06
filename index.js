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
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.khmigmu.mongodb.net/?appName=Cluster1`;

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

}
run().catch(console.dir);
