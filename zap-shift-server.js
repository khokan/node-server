require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;
const app = express();
// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  // Connect the client to the server	(optional starting in v4.7)
  await client.connect();

  const db = client.db("parceldb");
  const parcelCollection = db.collection("parcels");
  try {
    // Generate jwt token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (err) {
        res.status(500).send(err);
      }
    });

    // add a parcel in db
    app.post("/parcels", async (req, res) => {
      const parcel = req.body;
      const result = await parcelCollection.insertOne(parcel);
      res.send(result);
    });

    // GET /api/parcels
    // Retrieves parcels sorted by creationDate (latest first).
    // If query param 'email' is provided, filter results by creatorEmail.
    app.get("/parcels", async (req, res) => {
      try {
        const { email } = req.query;
        // Build filter: if email is provided, filter by creatorEmail; otherwise, no filtering.
        const filter = email ? { created_by: email } : {};
        // Find parcels and sort by creationDate descending
        const parcels = await parcelCollection
          .find(filter)
          .sort({ creation_date: -1 })
          .toArray();
        res.send(parcels);
      } catch (error) {
        console.error("Error retrieving parcels:", error);
        res.status(500).json({ message: "Server error fetching parcels" });
      }
    });

    app.get('/parcels/:id', async (req, res) => {
      try {

        const  id  = req.params;

        const parcel = await parcelCollection.findOne({ _id: new ObjectId(id)});

        if (!parcel) {
          return res.status(404).json({ error: 'Parcel not found' });
        }
        res.send(parcel);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // DELETE /api/parcels/:id
    app.delete("/parcels/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid ID format" });
        }

        // MongoDB with Mongoose example
        const deletedParcel = await parcelCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (!deletedParcel) {
          return res.status(404).json({ message: "Parcel not found" });
        }

        res.send(deletedParcel);
      } catch (error) {
        res.status(500).json({
          message: "Server error",
          error: error.message,
        });
      }
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from plantNet Server..");
});

app.listen(port, () => {
  console.log(`plantNet is running on port ${port}`);
});
