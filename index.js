const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.port || 5000;

//middlewares
app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true
}));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qvjjrvn.mongodb.net/?appName=Cluster0`;

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

        const assignmentCollection = client.db("study-sync").collection("assignments");
        const featureCollection = client.db("study-sync").collection("features");

        // 
        app.post('/create-assignment', async (req, res) => {
            const assignment = req.body;
            const result = await assignmentCollection.insertOne(assignment);
            res.send(result);
        });

        app.get('/assignments', async (req, res) => {
            const result = await assignmentCollection.find().toArray();
            res.send(result);
        });

        app.get('/assignment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await assignmentCollection.findOne(query);
            res.send(result);
        });

        app.get('/features', async (req, res) => {
            const result = await featureCollection.find().toArray();
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


app.get('/', async (req, res) => {
    res.send('studySync server is study');
});

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});