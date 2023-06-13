const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const app = express();
require('dotenv').config()
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const morgan = require('morgan')
const port = process.env.PORT || 5000;

// /middleware 
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'))


app.get('/', (req, res) => {
    res.send('Hello World');
});

// mongodb start

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ry6i5bk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// verifyJwt

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }

    const token = authorization.split(' ')[1]

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
    })
}
// verifyJwt


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Send a ping to confirm a successful connection

        const usersCollection = client.db('littleBirds').collection('users');
        const classesCollection = client.db('littleBirds').collection('classes');
        const bookingsCollection = client.db('littleBirds').collection('bookings')
        const paymentCollection = client.db('littleBirds').collection('payments')
        const paddingClassCollection = client.db('littleBirds').collection('paddingClasses')
        const feedbackCollection = client.db('littleBirds').collection('feedback')


        // jwt api 

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d',
            })
            res.send({ token })
        })
        // jwt api end 

        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'teacher') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        // classes all api
        app.post('/classes', async (req, res) => {
            const body = req.body;
            const result = await classesCollection.insertOne(body)
            res.send(result);
        })
        app.get('/classes', async (req, res) => {

            const result = await classesCollection.find().toArray()
            res.send(result);
        })
        app.get('/class/:id', async (req, res) => {
            const id = req.params.id
            const result = await classesCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        })
        app.get('/myActiveClass/:email', verifyJWT, verifyInstructor, async (req, res) => {
            const email = req.params.email;
            try {
                const result = await classesCollection.find({ instructor_email: email }).toArray();
                res.send(result);
            } catch (error) {
                console.error('Error retrieving class:', error);
                res.status(500).send('Error retrieving class');
            }
        });






        // user api start
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const query = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user,
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })




        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            const result = await usersCollection.findOne({ email: email });
            res.send(result)
        })
        app.patch('/updateSomeInfo', verifyJWT, async (req, res) => {
            const { Product_id, available_seats, number_of_students } = req.body;


            const result = await classesCollection.updateOne(
                { _id: new ObjectId(Product_id) },
                { $set: { available_seats, number_of_students } }
            )

            res.send(result)




        });

        // class booking start 
        '/bookings'

        app.post('/bookings', verifyJWT, async (req, res) => {
            const body = req.body;
            const booking = await bookingsCollection.insertOne(body);
            res.send(booking);

        })

        app.get('/bookings/:id', verifyJWT, async (req, res) => {

            const id = req.params.id;

            const result = await bookingsCollection.findOne({ Product_id: id })
            res.send(result);
        })
        app.get('/userBookings/:email', verifyJWT, async (req, res) => {

            const email = req.params.email;
            const query = { user_email: email };

            const result = await bookingsCollection.find(query).toArray();
            res.send(result);

        });
        app.delete('/deleteBookings/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const result = await bookingsCollection.deleteOne(query);
            res.send(result)
        })

        // class booking start 

        //  booking payment start 

        app.post('/payments', verifyJWT, async (req, res) => {
            const body = req.body;
            const result = await paymentCollection.insertOne(body);
            res.send(result);


        })

        app.get('/userPayments/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { user_email: email };
            console.log(query);
            const result = await paymentCollection.find(query).toArray();
            res.send(result);

        })

        app.delete('payments/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { id: id }
            const result = await bookingsCollection.deleteOne(query);
            res.send(result)
        })



        //  booking payment end
        // user api end

        //  teacher api
        app.post('/paddingClass', verifyJWT, verifyInstructor, async (req, res) => {
            const body = req.body;
            const results = await paddingClassCollection.insertOne(body);
            res.send(results);

        })

        app.get('/approvedClass', verifyJWT, verifyAdmin, async (req, res) => {
            const results = await paddingClassCollection.find().toArray()
            res.send(results);
        })
        app.get('/MyClass/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { instructor_email: email }
            const results = await paddingClassCollection.find(query).toArray()
            res.send(results);
        })
        app.post('/PostClasses', verifyJWT, verifyAdmin, async (req, res) => {

            const body = req.body;
            const result = await classesCollection.insertOne(body);
            res.send(result);

        });


        app.delete('/deleteClass/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const result = await paddingClassCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        app.patch('/UpdateUsers/:email', async (req, res) => {
            const email = req.params.email;
            const { role } = req.body;
            const query = { email: email };
            const updateDoc = { $set: { role: role } };

            try {
                const result = await usersCollection.updateOne(query, updateDoc);
                res.send(result);
            } catch (error) {
                console.error('Error updating user:', error);
                res.status(500).send('Error updating user');
            }
        });

        app.patch('/UpdateStatus/:id', async (req, res) => {
            const id = req.params.id;
            const { status } = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: status } };

            try {
                const result = await paddingClassCollection.updateOne(query, updateDoc);
                res.send(result);
            } catch (error) {
                console.error('Error updating Status:', error);
                res.status(500).send('Error updating status');
            }
        });
        app.patch('/UpdateFeedback/:id', async (req, res) => {
            const id = req.params.id;
            const { feedback } = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = { $set: { feedback: feedback } };

            try {
                const result = await paddingClassCollection.updateOne(query, updateDoc);
                res.send(result);
            } catch (error) {
                console.error('Error updating Status:', error);
                res.status(500).send('Error updating status');
            }
        });

        app.get('/allUsers', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        app.post('/feedbackByAdmin', verifyJWT, verifyAdmin, async (req, res) => {
            const body = req.body;
            const result = await feedbackCollection.insertOne(body)
            res.send(result);

        })


        //  admin api 

        // payment 
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })








        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


    } finally {
        // Ensures that the client will close when you finish/error

        // await client.close();
    }
}
run().catch(console.dir);

// mongodb end
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})