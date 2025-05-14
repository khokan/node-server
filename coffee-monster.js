const express = require("express");
const cors = require("cors");
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express(); // create express app
const port = process.env.PORT || 5000; 
app.use(cors()); // for cross-origin
app.use(express.json()); // for parsing application/json

app.listen(port, () => {
    console.log(`server listening on port ${port}`);
  });

  app.get("/", (req, res) => {
    res.send("Hello world from coffee-monster server ..");
  });

  app.get("/coffees", (req, res) => {
    res.send("Hello world from coffee-monster server ..");
  });

  const uri =`mongodb+srv://${process.env.DB_USER_COFFEE}:${process.env.DB_PASS_COFFEE}@cluster0.vqav3xl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri,  {
  serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
  }
}
);

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const coffesCollection = client.db('coffeDB').collection('coffees')

    app.post('/coffees', async (req, res) => {
        const newCoffee = req.body
        const result = await coffesCollection.insertOne(newCoffee)
        console.log(result)
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
