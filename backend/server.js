require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs')
const PDFDocument = require('pdfkit')

const app = express()

// === CORS ===
// Allow all origins for simplicity
app.use(cors())

// === Body Parser ===
app.use(bodyParser.json())

// === MongoDB Connection ===
const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  console.error('No Mongo URI found. Check your .env file!')
  process.exit(1)
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err))

// === Models ===
const shipmentSchema = new mongoose.Schema({
  recipient: { type: String, required: true },
  address: { type: String, required: true },
  weight: { type: Number, required: true },
  service: { type: String, required: true },
  labelPath: { type: String },
  createdAt: { type: Date, default: Date.now },
})

const Shipment = mongoose.model('Shipment', shipmentSchema)

// === PDF Labels Folder ===
const labelsDir = path.join(__dirname, 'labels')
if (!fs.existsSync(labelsDir)) fs.mkdirSync(labelsDir)

// Serve labels statically
app.use('/labels', express.static(labelsDir))

// === Routes ===

// Root route
app.get('/', (req, res) => {
  res.send('Mini Shipping Manager Backend is running!')
})

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' })
})

// Get the 5 most recent shipments
app.get('/api/shipments', async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ createdAt: -1 }).limit(5) // only most recent 5
    res.json(shipments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create a shipment
app.post('/api/shipments', async (req, res) => {
  try {
    const { recipient, address, weight, service } = req.body
    if (!recipient || !address || !weight || !service) {
      return res
        .status(400)
        .json({ error: 'recipient, address, weight, and service are required' })
    }

    const shipment = new Shipment({ recipient, address, weight, service })
    await shipment.save()

    // Generate PDF
    const fileName = `label-${shipment._id}.pdf`
    const filePath = path.join(labelsDir, fileName)

    const doc = new PDFDocument()
    const writeStream = fs.createWriteStream(filePath)
    doc.pipe(writeStream)
    doc.fontSize(20).text('Shipping Label', { align: 'center' })
    doc.moveDown()
    doc.fontSize(14).text(`Recipient: ${recipient}`)
    doc.text(`Address: ${address}`)
    doc.text(`Weight: ${weight} lb`)
    doc.text(`Service: ${service}`)
    doc.end()

    // After generating the PDF
    writeStream.on('finish', async () => {
      try {
        // Make sure this points to your backend, NOT Netlify
        const backendURL =
          process.env.BACKEND_URL ||
          'https://mini-shipping-manager-backend.onrender.com'
        shipment.labelPath = `${backendURL}/labels/${fileName}`
        await shipment.save()
      } catch (err) {
        console.error('Error updating labelPath:', err)
      }
    })

    writeStream.on('error', (err) => console.error('PDF write error:', err))

    res.json(shipment)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// === Start Server ===
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Test API: http://localhost:${PORT}/api/test`)
})
