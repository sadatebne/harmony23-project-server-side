const express = require('express')
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000
//jwt
const jwt = require('jsonwebtoken');
//STRIPE
const stripe = require('stripe')(process.env.STRIPE_KEY)
//DB
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
//dotenv
require('dotenv').config()

//middleware
app.use(cors())
app.use(express.json())

//jwt middleware
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
  
    jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
      }
      req.decoded = decoded;
      next();
    })
  }

//DB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rsw32ip.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('hello world')
})

//DB
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const usersCollection = client.db("harmonyDB").collection("users");
        const classesCollection = client.db("harmonyDB").collection("classes");
        const cartsCollection = client.db("harmonyDB").collection("carts");


        //JWT
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.JWT_TOKEN, { expiresIn: '2h' })
            res.send({token})
        })

        app.get('/users', async(req,res)=>{
            const result= await usersCollection.find().toArray()
            res.send(result)
        })

        //check Admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
      
            if (req.decoded.email !== email) {
             return res.send({ admin: false })
            }
      
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
          })

          //check instructor
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
      
            if (req.decoded.email !== email) {
             return res.send({ instructor: false })
            }
      
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
          })

        app.post('/users', async (req, res) => {
            const users = req.body
            const query = { email: users.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user exist' })
            }
            const result = await usersCollection.insertOne(users)
            res.send(result)
        })

        app.patch('/users/admin/:id', async(req, res)=>{
            const id=req.params.id
            const filter={_id:new ObjectId (id)}
            const updateDoc={
                $set:{
                    role: 'admin'
                }
            };
            const result =await usersCollection.updateOne(filter,updateDoc)
            res.send(result)
        })

        app.patch('/users/instructor/:id', async(req, res)=>{
            const id=req.params.id
            const filter={_id:new ObjectId (id)}
            const updateDoc={
                $set:{
                    role: 'instructor'
                }
            };
            const result =await usersCollection.updateOne(filter,updateDoc)
            res.send(result)
        })

        app.delete('/users/delete/:id', async(req,res)=>{
            const id=req.params.id
            const query={_id:new ObjectId(id)}
            const result= await usersCollection.deleteOne(query)
            res.send(result)
        })


        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray()
            res.send(result)
        })

        app.post('/addclass', async (req, res) => {
            const newItem=req.body
            const result = await classesCollection.insertOne(newItem)
            res.send(result)
        })

        app.patch('/classes/approved/:id', async (req, res) => {

            const id=req.params.id
            const filter={_id:new ObjectId (id)}
            const updateDoc={
                $set:{
                    status: 'approved'
                }
            };

            const result =await classesCollection.updateOne(filter,updateDoc)
            res.send(result)
        })

        app.get('/aprovedclasses/:status', async (req, res) => {
            const status = req.params.status
            const query = { status: status }
            const result = await classesCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/addcarts', async (req, res) => {
            const item = req.body
            const result = await cartsCollection.insertOne(item)
            res.send(result)

        })

        //carts item
        app.get('/carts',verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
               return res.send([]);
            }

            const decodedEmail= req.decoded.email
            console.log(decodedEmail)
            if(email !== decodedEmail){
                return res.status(403).send({error:true, message:'forbidden user'})
            }

            const query = { email: email };
            const result = await cartsCollection.find(query).toArray();
            // console.log(result)
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })

        //payment-intent
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = price * 100

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });

        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log('server running on', port)
})