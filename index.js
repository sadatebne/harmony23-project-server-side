const express = require('express')
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000
//DB
const { MongoClient, ServerApiVersion } = require('mongodb');
//dotenv
require('dotenv').config()

//middleware
app.use(cors())
app.use(express.json())

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

app.get('/', (req, res)=>{
    res.send('hello world')
})

//DB
async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();

      const usersCollection = client.db("harmonyDB").collection("users"); 
      const classesCollection = client.db("harmonyDB").collection("classes"); 

      app.post('/users', async(req, res)=>{
        const users=req.body
        const query ={email : users.email }
        const existingUser=await usersCollection.findOne(query)
        if(existingUser){
            return res.send({message: 'user exist'})
        }
        const result=await usersCollection.insertOne(users)
        res.send(result)
    })

    app.get('/popularcalsses', async(req,res)=>{
        const result=await classesCollection.find().toArray()
        res.send(result)
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

app.listen(port,()=>{
 console.log('server running on', port)
})