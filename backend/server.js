require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs')

const app = express()

// Middleware
app.use(cors())
app.use(bodyParser.json())

// MongoDB
const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  console.error('No Mongo URI found. Check your .env file!')
  process.exit(1)
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err))

// Serve labels statically
const labelsDir = path.join(__dirname, 'labels')
if (!fs.existsSync(labelsDir)) fs.mkdirSync(labelsDir)
app.use('/labels', express.static(labelsDir))

// Routes
const shipmentsRoutes = require('./routes/shipments')
app.use('/api/shipments', shipmentsRoutes)

// Root route
app.get('/', (req, res) => {
  res.send('Mini Shipping Manager Backend is running!')
})

// Start server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Test API: http://localhost:${PORT}/api/test`)
})
