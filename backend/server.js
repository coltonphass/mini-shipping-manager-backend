// backend/server.js
require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()

// CORS configuration to allow frontend on port 5500
const corsOptions = {
  origin: 'http://127.0.0.1:5500', // or 'http://localhost:5500'
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(bodyParser.json()) // parse JSON bodies

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

// Load and mount routes
console.log('Loading shipments routes...')
try {
  const shipmentsRoutes = require('./routes/shipments')
  app.use('/api/shipments', shipmentsRoutes)
  console.log('✅ Shipments routes loaded successfully')
} catch (err) {
  console.error('❌ Error loading shipments routes:', err)
}

// static route to serve generated labels for download
app.use('/labels', express.static(__dirname + '/labels'))

// Add a test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' })
})

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Start server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Test the server: http://localhost:${PORT}/api/test`)
})
