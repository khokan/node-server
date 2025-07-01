require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;

// FireBase  admin SDK
const admin = require("firebase-admin");
const serviceAccount = require("./Firebase-admin-key-coffee-store.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY); // Use your Stripe secret key

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

  // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
  //   if (err) {
  //     console.log(err);
  //     return res.status(401).send({ message: "unauthorized access" });
  //   }
  //   req.user = decoded;
  //   next();
  // });
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
  const paymentCollection = db.collection("payments");
  const usersCollection = db.collection('users');
  const ridersCollection = db.collection('riders');

  //  // Generate jwt token
  //   app.post("/jwt", async (req, res) => {
  //     const email = req.body;
  //     const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
  //       expiresIn: "365d",
  //     });
  //     res
  //       .cookie("token", token, {
  //         httpOnly: true,
  //         secure: process.env.NODE_ENV === "production",
  //         sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  //       })
  //       .send({ success: true });
  //   });

  // custom middlewares
  const verifyFBToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
          return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = authHeader.split(' ')[1];
      if (!token) {
          return res.status(401).send({ message: 'unauthorized access' })
      }

      // verify the token
      try {
          const decoded = await admin.auth().verifyIdToken(token);
          req.decoded = decoded;
          next();
      }
      catch (error) {
          return res.status(403).send({ message: 'forbidden access' })
      }
  }
        
  try {

   
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

    app.post('/users', async (req, res) => {
            const email = req.body.email;
            const userExists = await usersCollection.findOne({ email })
            if (userExists) {
                // update last log in
                return res.status(200).send({ message: 'User already exists', inserted: false });
            }
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

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

     app.post('/riders', async (req, res) => {
            const rider = req.body;
            const result = await ridersCollection.insertOne(rider);
            res.send(result);
        })

          app.get("/riders/pending", async (req, res) => {
            try {
                const pendingRiders = await ridersCollection
                    .find({ status: "pending" })
                    .toArray();

                res.send(pendingRiders);
            } catch (error) {
                console.error("Failed to load pending riders:", error);
                res.status(500).send({ message: "Failed to load pending riders" });
            }
        });

      app.get("/riders/active", async (req, res) => {
        const result = await ridersCollection.find({ status: "active" }).toArray();
        res.send(result);
    });

    app.patch("/riders/:id/status", async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const query = { _id: new ObjectId(id) }
        const updateDoc = {
            $set:
            {
                status
            }
        }

        try {
            const result = await ridersCollection.updateOne(
                query, updateDoc

            );
            res.send(result);
        } catch (err) {
            res.status(500).send({ message: "Failed to update rider status" });
        }
    });

   app.post("/tracking", async (req, res) => {
            const { tracking_id, parcel_id, status, message, updated_by='' } = req.body;

            const log = {
                tracking_id,
                parcel_id: parcel_id ? new ObjectId(parcel_id) : undefined,
                status,
                message,
                time: new Date(),
                updated_by,
            };

            const result = await trackingCollection.insertOne(log);
            res.send({ success: true, insertedId: result.insertedId });
        });
     
    // POST: Record payment and update parcel status
        app.post('/payments', async (req, res) => {
            try {
                const { parcelId, email, amount, paymentMethod, transactionId } = req.body;

                // 1. Update parcel's payment_status
                const updateResult = await parcelCollection.updateOne(
                    { _id: new ObjectId(parcelId) },
                    {
                        $set: {
                            payment_status: 'paid'
                        }
                    }
                );

                if (updateResult.modifiedCount === 0) {
                    return res.status(404).send({ message: 'Parcel not found or already paid' });
                }

                // 2. Insert payment record
                const paymentDoc = {
                    parcelId,
                    email,
                    amount,
                    paymentMethod,
                    transactionId,
                    paid_at_string: new Date().toISOString(),
                    paid_at: new Date(),
                };

                const paymentResult = await paymentsCollection.insertOne(paymentDoc);

                res.status(201).send({
                    message: 'Payment recorded and parcel marked as paid',
                    insertedId: paymentResult.insertedId,
                });

            } catch (error) {
                console.error('Payment processing failed:', error);
                res.status(500).send({ message: 'Failed to record payment' });
            }
        });


  app.get('/payments', async (req, res) => {
            try {
                const userEmail = req.query.email;

                const query = userEmail ? { email: userEmail } : {};
                const options = { sort: { paid_at: -1 } }; // Latest first

                const payments = await paymentCollection.find(query, options).toArray();
                res.send(payments);
            } catch (error) {
                console.error('Error fetching payment history:', error);
                res.status(500).send({ message: 'Failed to get payments' });
            }
        });

  app.post('/create-payment-intent', async (req, res) => {
      try {
        const amountInCents = req.body.amountInCents
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents, // Amount in cents
          currency: 'usd',
          payment_method_types: ['card'],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: error.message });
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
  res.send("Hello from zap-shift Server..");
});

app.listen(port, () => {
  console.log(`zap-shift is running on port ${port}`);
});
