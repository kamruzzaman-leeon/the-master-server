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
        const teacherCollection = client.db('TheMaster').collection("teachers");

        //jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        //middlewares
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization;
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }
        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }
        const verifyTeacher = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isTeacher = user?.role === 'teacher';
            if (!isTeacher) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        // user related api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })
        app.get('/user/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            res.send(user);
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role == 'admin';
            }
            res.send({ admin });
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

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        app.post('/teachers', verifyToken, async (req, res) => {
            const teacher = req.body;
            const query = { email: teacher.email }
            const existingUser = await teacherCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await teacherCollection.insertOne(teacher);
            res.send(result);
        })

        app.get('/teachers', verifyToken, verifyAdmin, async (req, res) => {
            const result = await teacherCollection.find().toArray();
            res.send(result);
        })

        app.get('/users/teacher/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let teacher = false;
            if (user) {
                teacher = user?.role == 'teacher';
            }
            res.send({ teacher });
        })
        app.patch('/users/teacher/:id', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            console.log(item)
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: item.status
                }
            }
            const result = await teacherCollection.updateOne(filter, updatedDoc);
            if (result.modifiedCount) {
                const userroleresult = await userCollection.updateOne({ email: item.email }, { $set: { role: 'teacher' } })
            }
            res.send(result);
        })
        
        // classes/admin

        app.get('/classes', async (req, res) => {
            const { email } = req.query;
        
            if (email) {
                // If email is provided, filter the data based on the email
                const result = await classesCollection.find({ email:email }).toArray();
                res.send(result);
            } else {
                // If no email is provided, return all data
                const result = await classesCollection.find().toArray();
                res.send(result);
            }
        });

        app.post('/teacher/addclass',verifyToken,verifyTeacher, async (req, res) => {
            const item = req.body;
            const result = await classesCollection.insertOne(item);
            console.log(result)
            res.send(result);
        })

        
        app.delete('/classes/:id', verifyToken, verifyTeacher, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classesCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/classes/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            console.log(item)
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: item.status
                }
            }
            const result = await classesCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.get('/reviews', async (req, res) => {
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