require("dotenv").config(); // if you don't use data can't be access fron .env file
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express(); // create express app
const port = process.env.PORT || 5000;

//MiddleWare
app.use(express.json()); // for parsing application/json
app.use(cookieParser()); // set cookie-parser

app.use(
  cors({
    origin: [process.env.NODE_CLIENT_URL],
    credentials: true,
  })
); // for cross-origin

// jwt token related api
const jwt = require("jsonwebtoken");
app.post("/jwt", async (req, res) => {
  const { email } = req.body;
  const user = { email };
  const token = await jwt.sign(user, process.env.JWT_ACCESS_TOKEN, {
    expiresIn: "1d",
  });

  // set token in the cookies
  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
  });

  res.send({ success: true });
  // res.send({ token }); // will send if local storage is used in client side
});

const logger = (req, res, next) => {
  console.log("logger in the middleware");
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    res.status(401).send({ message: "unauthorozed access" });
  }

  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) res.status(401).send({ message: "unauthorized access2" });
    req.decoded = decoded;
    console.log(decoded.email);
    next();
  });
};

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("Hello world from career-code server ..");
});

const uri = `mongodb+srv://${process.env.DB_USER_CAREER}:${process.env.DB_PASS_CAREER}@cluster0.vqav3xl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const jobsCollection = client.db("careerCode").collection("jobs");
    const jobsApplications = client.db("careerCode").collection("applications");

    app.get("/jobs/applications", async (req, res) => {
      const email = req.query.email;
      const query = { hr_email: email };
      const jobs = await jobsCollection.find(query).toArray();
      for (const job of jobs) {
        const applicationQuery = { jobid: job._id.toString() };
        const applicationCount = await jobsApplications.countDocuments(
          applicationQuery
        );
        job.application_count = applicationCount;
      }
      res.send(jobs);
    });

    app.get("/jobs", async (req, res) => {
      const query = {};
      const email = req.query.email;
      if (email) query.hr_email = email;
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid coffee ID format" });
      }

      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    app.get("/applications/jobs/:job_id", async (req, res) => {
      const job_id = req.params.job_id;

      const query = { jobid: job_id };
      const result = await jobsApplications.find(query).toArray();
      res.send(result);
    });

    app.post("/applications", async (req, res) => {
      const newApplication = req.body;
      const result = await jobsApplications.insertOne(newApplication);
      res.send(result);
    });

    app.patch("/applications/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = {
        _id: new ObjectId(id),
      };
      const updateDoc = {
        $set: { status: req.body.status },
      };
      const result = await jobsApplications.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/applications", logger, verifyToken, async (req, res) => {
      const email = req.query.email;

      if (email !== req.decoded.email)
        res.status(404).send({ message: "forbidden access" });

      const query = {
        email,
      };
      const result = await jobsApplications.find(query).toArray();

      // bad way to aggregate data
      for (const application of result) {
        const jobid = application.jobid;
        const jobQuery = { _id: new ObjectId(jobid) };
        const job = await jobsCollection.findOne(jobQuery);
        application.company = job.company;
        application.title = job.title;
        application.company_logo = job.company_logo;
      }

      res.send(result);
    });

    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);
