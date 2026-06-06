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