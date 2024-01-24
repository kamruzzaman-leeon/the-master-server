const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config()
//middleware
app.use(cors())
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jfba5ry.mongodb.net/?retryWrites=true&w=majority`;

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
        const userCollection = client.db('TheMaster').collection("users");
        const classesCollection = client.db('TheMaster').collection("classes");
        const reviewsCollection = client.db('TheMaster').collection("reviews");

        //jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        //middlewares
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers);
            if (!req.headers.authorization) {
                return res.status(403).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization;
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
            })
            next();
        }


        // user related api
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/classes',async(req,res)=>{
            const result = await classesCollection.find().toArray();
            // console.log(result);
            res.send(result);
        })

        app.get('/reviews',async(req,res)=>{
            const result = await reviewsCollection.find().toArray();
            res.send(result);
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


app.get('/', (req, res,) => {
    res.send('the Master is ready')
})

app.listen(port, () => {
    console.log(`The master is ready on port ${port}`)
})