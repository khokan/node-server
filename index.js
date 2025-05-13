const express = require("express");
const cors = require("cors");
const blogs = require("./blogs.json");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express(); // create express app
const port = process.env.PORT || 5000; 
app.use(cors()); // for cross-origin
app.use(express.json()); // for parsing application/json

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("Hello world from server ..");
});

// ----------------------------------
app.get("/blogs", (req, res) => {
  res.send(blogs);
});

app.get("/blog/:id", (req, res) => {
  const id = parseInt(req.params.id);
  console.log("I need data for", id);
  const blog = blogs.find((blog) => blog.id === id) || {};
  res.send(blog);
});
// ...............app....................

const customers = [
  {
    id: 1,
    name: "Hamza Sohail",
    email: "eI5oV@example.com",
  },
  {
    id: 2,
    name: "Sajal Ali",
    email: "b6L6I@example.com",
  },
  {
    id: 3,
    name: "Anmol Baloch",
    email: "9e5oN@example.com",
  },
]

app.get("/customers", (req, res) => {
  res.send(customers);
});

app.post("/customers", (req, res) => {
  const customer = req.body;
  console.log(customer);
  customer.id = customer.length + 1;
  customers.push(customer);
  res.send(customer);
  console.log('adding customer');
})

app.get("/customers/:id", (req, res) => {
  const id = parseInt(req.params.id);
  console.log("I need data for", id);
  const customer = customers.find((user) => user.id === id) || {};
  res.send(customer);
});

// *******************************************************

const users = [ 
  { id: 1, name: "John Doe", email: "johndoe@example.com", }, 
  { id: 2, name: "Jane Smith", email: "janesmith@example.com", }, 
  { id: 3, name: "Alice Johnson", email: "alicejohnson@example.com", }, 
];

// app.get("/users", (req, res) => {
//   res.send(users);
// });

//uA6y-8Qjz9ntV!3

const uri = "mongodb+srv://kk:uA6y-8Qjz9ntV!3@cluster0.vqav3xl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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


    const database = client.db('userdb');
    const usersCollection = database.collection('users');

    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/users/:id", async(req,res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.findOne(query)
      res.send(result)
    })

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user); 
      res.send(result); 
    })

    app.put('/users/:id', async(req,res) => {
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const options = {upset: true}
      const updatedDoc = {
        $set: {
          name: user.name,
          email: user.email
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc,options)
      // res.send(user)

    })

    app.delete("/users/:id", async (req, res) => {
       const id = req.params.id;
       const query = { _id:new ObjectId(id)}
      const result = await usersCollection.deleteOne(query);
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


