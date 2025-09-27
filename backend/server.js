require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()

// Allow all origins (good for testing) or whitelist your frontend domain
const corsOptions = {
  origin: [
    'http://127.0.0.1:5500', // local dev
    'http://localhost:5500', // local dev
    'https://mini-shipment-manager.netlify.app/',
  ],
  optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(bodyParser.json())

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  console.error('No Mongo URI found. Check your .env file!')
  process.exit(1)
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err))

// Routes
const shipmentsRoutes = require('./routes/shipments')
app.use('/api/shipments', shipmentsRoutes)

// Serve labels
app.use('/labels', express.static(__dirname + '/labels'))

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' })
})

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Start server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Test API: http://localhost:${PORT}/api/test`)
})
