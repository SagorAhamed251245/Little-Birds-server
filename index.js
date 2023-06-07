const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
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

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ry6i5bk.mongodb.net/?retryWrites=true&w=majority`;

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
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        // Send a ping to confirm a successful connection

        const classesCollection = client.db('littleBirds').collection('classes');

        // classes all api

    app.get('/classes' , async (req, res) => {
           const result = await classesCollection.find().toArray()
           res.send(result);
    })
















      

 
               
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