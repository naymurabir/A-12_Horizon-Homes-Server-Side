const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
var cookieParser = require('cookie-parser')
var jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000;

//Middleware 
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())


//Database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cgjyfgp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Custom Middleware 
const logger = async (req, res, next) => {
    console.log("Called:", req.host, req.originalUrl);
    next()
}

const verifyToken = async (req, res, next) => {
    const token = req.cookies.token
    console.log("The desired token:", token);

    if (!token) {
        return res.status(401).send({ message: "Unauthorized" })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized" })
        }
        console.log("The value of token:", decoded);
        req.decoded = decoded
        next()
    })

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const usersCollection = client.db("horizonHomesDB").collection("users")

        // ---------------------------------------------------------
        //JWT Related APIs
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.cookie('token', token, {
                httpOnly: true,
                // secure: false,
                // sameSite: 'none'

            }).send({ success: true })
        })

        //Remove token after logout the user
        app.post('/logout', async (req, res) => {
            const user = req.body
            console.log("User: ", user);
            res.clearCookie('token', {
                maxAge: 0,
                // secure: process.env.NODE_ENV === 'production' ? true : false,
                // sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            })
                .send({ status: true })
        })

        // ---------------------------------------------------------

        //Users related APIs
        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const existUser = await usersCollection.findOne(query)
            if (existUser) {
                return res.send({ message: "User already exists.", insertedId: null })
            } else {
                const result = await usersCollection.insertOne(user)
                res.send(result)
            }
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Horizon Homes server is running...")
})

app.listen(port, (req, res) => {
    console.log(`The horizon homes server is running on port ${port}`);
})
