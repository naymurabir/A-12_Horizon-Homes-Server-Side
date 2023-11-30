const express = require('express');
const cors = require('cors');
require('dotenv').config()
var jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

//Middleware 
app.use(cors())
app.use(express.json())


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


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)


        const usersCollection = client.db("horizonHomesDB").collection("users")

        const propertiesCollection = client.db("horizonHomesDB").collection("properties")

        const allPropertiesCollection = client.db("horizonHomesDB").collection("allProperties")

        const wishlistsCollection = client.db("horizonHomesDB").collection("wishlists")

        const reviewsCollection = client.db("horizonHomesDB").collection("reviews")

        const offeredPropertiesCollection = client.db("horizonHomesDB").collection("offeredProperties")

        const paymentsCollection = client.db("horizonHomesDB").collection("payments")

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

        app.get('/users', async (req, res) => {
            const cursor = usersCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user.role === 'admin'
            }
            res.send({ admin })
        })

        app.get('/users/agent/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let agent = false
            if (user) {
                agent = user.role === 'agent'
            }
            res.send({ agent })
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/users/admin/:id', async (req, res) => {
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

        app.patch('/users/agent/:id', async (req, res) => {
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

        app.patch('/users/fraud/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'fraud'
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

        app.get('/properties', async (req, res) => {
            const cursor = propertiesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/myAddedProperties', async (req, res) => {
            let query = {}
            if (req.query?.email) {
                query = { email: req.query?.email }
            }
            const result = await propertiesCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/updateProperty/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await propertiesCollection.findOne(query)
            res.send(result)
        })

        app.put('/updateProperty/:id', async (req, res) => {
            const id = req.params.id;
            const propertyUpdate = req.body
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    title: propertyUpdate.title,
                    location: propertyUpdate.location,
                    agent_name: propertyUpdate.agent_name,
                    email: propertyUpdate.email,
                    price_range: propertyUpdate.price_range,
                    image: propertyUpdate.image,
                    details: propertyUpdate.details,

                }
            }
            const result = await propertiesCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.delete('/myAddedProperties/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await propertiesCollection.deleteOne(query)
            res.send(result)
        })

        app.put('/properties', async (req, res) => {
            const filter = { _id: new ObjectId(req.query.id) }
            console.log(filter);
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

        app.get('/allProperties', async (req, res) => {
            const cursor = allPropertiesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/propertyDetails/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await allPropertiesCollection.findOne(query)
            res.send(result)
        })

        //-------------------Wishlist Related APIs----------------
        app.post('/wishlists', async (req, res) => {
            const newWishlist = req.body
            const result = await wishlistsCollection.insertOne(newWishlist)
            res.send(result)
        })

        app.get('/wishlists', async (req, res) => {
            let query = {}
            if (req.query?.email) {
                query = { email: req.query?.email }
            }
            const result = await wishlistsCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/makeOffer/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await wishlistsCollection.findOne(query)
            res.send(result)
        })

        app.delete('/wishlists/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await wishlistsCollection.deleteOne(query)
            res.send(result)
        })


        //------------------Reviews Related APIs------------------
        app.post('/reviews', async (req, res) => {
            const newReview = req.body
            const result = await reviewsCollection.insertOne(newReview)
            res.send(result)
        })

        app.get('/reviewsAll', async (req, res) => {
            const cursor = reviewsCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/reviews', async (req, res) => {
            let query = {}
            if (req.query?.email) {
                query = { email: req.query?.email }
            }
            const result = await reviewsCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/reviews/:title', async (req, res) => {
            const title = req.params.title
            const query = { title: title }
            console.log('Query', query);
            const result = await reviewsCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/reviewsAll/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await reviewsCollection.deleteOne(query)
            res.send(result)
        })

        app.delete('/reviews/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await reviewsCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/latestReviews', async (req, res) => {
            const result = await reviewsCollection.find().sort({ _id: -1 }).limit(4).toArray()
            res.send(result)
        })


        //-----------------Offered Properties Related APIs------------
        app.post('/offeredProperties', async (req, res) => {
            const newOfferCategory = req.body
            const result = await offeredPropertiesCollection.insertOne(newOfferCategory)
            res.send(result)
        })


        app.get('/requestedProperties', async (req, res) => {
            let query = {}
            if (req.query?.email) {
                query = {
                    agent_email: req.query?.email
                }
            }
            const result = await offeredPropertiesCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/propertiesBaught', async (req, res) => {
            let query = {}
            if (req.query?.email) {
                query = {
                    buyer_email: req.query?.email
                }
            }
            const result = await offeredPropertiesCollection.find(query).toArray()
            res.send(result)
        })


        app.put('/requestedProperty', async (req, res) => {
            const filter = { _id: new ObjectId(req.query.id) }
            console.log(filter);
            const updatedDoc = {
                $set: {
                    status: "accepted"
                }
            }
            const result = await offeredPropertiesCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.put('/requestedProperty/reject', async (req, res) => {
            const filter = { _id: new ObjectId(req.query.id) }
            const updatedDoc = {
                $set: {
                    status: "rejected"
                }
            }
            const result = await offeredPropertiesCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        //After a successful payment
        app.put('/requestedProperty/bought', async (req, res) => {
            const filter = { _id: new ObjectId(req.query.id) }
            const updatedDoc = {
                $set: {
                    status: "bought"
                }
            }
            const result = await offeredPropertiesCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })


        //------------------Payments Related APIs--------------------
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body
            const amount = parseInt(price * 100)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post("/payments", async (req, res) => {
            const newPayment = await paymentsCollection.insertOne(req.body)
            res.send(newPayment)
        })

        app.get('/boughtProperty/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { id: id };
            const result = await paymentsCollection.findOne(filter);
            res.send(result);
        });


        app.get('/soldProperties', async (req, res) => {
            let query = {}
            if (req.query?.email) {
                query = {
                    agent_email: req.query?.email
                }
            }
            const result = await paymentsCollection.find(query).toArray()
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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
