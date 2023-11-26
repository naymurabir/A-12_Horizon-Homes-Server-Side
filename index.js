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

        const propertiesCollection = client.db("horizonHomesDB").collection("properties")

        const allPropertiesCollection = client.db("horizonHomesDB").collection("allProperties")

        // Use verify admin admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded?.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        // Use verify admin admin after verifyToken
        const verifyAgent = async (req, res, next) => {
            const email = req.decoded?.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            console.log(user);
            const isAgent = user?.role === 'agent'
            if (!isAgent) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        //------------------JWT Related APIs------------------------

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

        //------------------Users related APIs-------------------
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

        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const cursor = usersCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "unauthorized access" })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user.role === 'admin'
            }
            res.send({ admin })
        })

        app.get('/users/agent/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "unauthorized access" })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let agent = false
            if (user) {
                agent = user.role === 'agent'
            }
            res.send({ agent })
        })

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                },
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.patch('/users/agent/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'agent'
                },
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        //------------------Properties Related APIs-------------------
        app.post('/properties', async (req, res) => {
            const newProperty = req.body
            const result = await propertiesCollection.insertOne(newProperty)
            res.send(result)
        })

        app.get('/properties', verifyToken, verifyAdmin, async (req, res) => {
            const cursor = propertiesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.put('/properties', async (req, res) => {
            const filter = { _id: new ObjectId(req.query.id) }
            const updatedDoc = {
                $set: {
                    status: "verified"
                }
            }
            const result = await propertiesCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.put('/properties/reject', async (req, res) => {
            const filter = { _id: new ObjectId(req.query.id) }
            const updatedDoc = {
                $set: {
                    status: "rejected"
                }
            }
            const result = await propertiesCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        //----------------All Properties Related APIs----------------
        app.post('/allProperties', async (req, res) => {
            const newProperty = req.body
            if (newProperty) {
                newProperty.status = "verified"
            }
            const result = await allPropertiesCollection.insertOne(newProperty)
            res.send(result)
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