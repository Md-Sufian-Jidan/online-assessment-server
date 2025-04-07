const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = process.env.port || 5000;

//middlewares
app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qvjjrvn.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// middlewares
const logger = async (req, res, next) => {
    console.log('called', req.host, req.originalUrl);
    next();
};

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('verify token', token);
    // no token available
    if (!token) {
        return res.status(401).send({ message: 'not authorized' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        // error 
        if (err) {
            return res.status(401).send({ message: 'unauthorized' });
        }
        // if token is valid then it would be decoded
        // console.log('value in the token', decoded);
        req.user = decoded;
        next();
    });
};

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const assignmentCollection = client.db("study-sync").collection("assignments");
        const submittedAssignmentCollection = client.db("study-sync").collection("submitted-assignments");
        const featureCollection = client.db("study-sync").collection("features");

        // jwt authentication
        // app.post('/jwt', logger, async (req, res) => {
        //     const user = req.body;
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        //     res
        //         .cookie('token', token, {
        //             httpOnly: true,
        //             secure: false,
        //             sameSite: 'none'
        //         })
        //         .send({ success: true });
        // });

        // app.post('/logout', logger, async (req, res) => {
        //     const user = req.body;
        //     console.log('logging user', user);
        //     // maxAge = 0 means expire the token
        //     res.clearCookie('token', { ...cookieOptions, maxAge: 0 })
        //         .send({ success: true })
        // });

        // assignment create api
        app.post('/create-assignment', logger, async (req, res) => {
            const assignment = req.body;
            const result = await assignmentCollection.insertOne(assignment);
            res.send(result);
        });
        // assignments get api
        app.get('/assignments', logger, async (req, res) => {
            const query = req.query.difficulty;
            const filter = { difficulty: query };
            if (query === 'all') {
                console.log(filter);
                const result = await assignmentCollection.find().toArray();
                return res.send(result);
            }
            const result = await assignmentCollection.find(filter).toArray();
            res.send(result);
        });

        app.get('/assignment/:id', logger, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await assignmentCollection.findOne(filter);
            res.send(result);
        });

        app.delete('/delete-assignment/:id', logger, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await assignmentCollection.deleteOne(filter);
            res.send(result);
        });

        app.patch('/update-assignment/:id', logger, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const { title, description, difficulty, marks, image, dueDate } = req.body;
            const update = {
                $set: {
                    title,
                    description,
                    difficulty,
                    marks,
                    image,
                    dueDate,
                },
            };
            const result = await assignmentCollection.updateOne(filter, update);
            res.send(result);
        });

        // submitted assignments apis
        app.post('/submit-assignment', logger, async (req, res) => {
            const submit = req.body;
            const result = await submittedAssignmentCollection.insertOne(submit);
            res.send(result);
        });

        app.get('/pending', logger, async (req, res) => {
            const result = await submittedAssignmentCollection.find().toArray();
            res.send(result);
        });

        app.patch('/complete-assignment/:id', logger, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const assignment = req.body;
            const update = {
                $set: {
                    assignment: req.body?.assignment,
                    submittedBy: assignment.submittedBy,
                    pdfLink: assignment.pdfLink,
                    note: assignment.note,
                    status: assignment?.status,
                    givenMark: assignment.givenMark,
                    feedback: assignment.feedback,
                },
            };
            const result = await submittedAssignmentCollection.updateOne(filter, update);
            res.send(result);
        });

        // my submissions api
        app.get('/my-submissions/:email', async (req, res) => {
            const email = req.params.email;
            const query = { submittedBy: email };
            console.log(query);
            const result = await submittedAssignmentCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/features', logger, async (req, res) => {
            const result = await featureCollection.find().toArray();
            res.send(result);
        });

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