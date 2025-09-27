const express = require('express')
const router = express.Router()
const Shipment = require('../models/shipment')
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

// GET /api/shipments - Fetch all shipments
router.get('/', async (req, res) => {
  console.log('GET /api/shipments called')
  try {
    const shipments = await Shipment.find().sort({ createdAt: -1 })
    console.log(`Found ${shipments.length} shipments`)
    res.json(shipments)
  } catch (err) {
    console.error('GET error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/shipments
router.post('/', async (req, res) => {
  console.log('POST /api/shipments called with body:', req.body)
  try {
    const { recipient, address, weight, service } = req.body
    if (!recipient || !address || !weight || !service) {
      console.log('Missing required fields')
      return res
        .status(400)
        .json({ error: 'recipient, address, weight, and service are required' })
    }

    console.log('Creating shipment...')
    // Create shipment in DB
    const shipment = new Shipment({ recipient, address, weight, service })
    await shipment.save()
    console.log('Shipment saved with ID:', shipment._id)

    // Send response immediately
    res.json(shipment)

    // Generate PDF in background
    generatePDFInBackground(shipment, recipient, address, weight, service)
  } catch (err) {
    console.error('POST error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Generate PDF in background (no response needed)
function generatePDFInBackground(
  shipment,
  recipient,
  address,
  weight,
  service
) {
  try {
    // Ensure labels folder exists
    const labelsDir = path.join(__dirname, '../labels')
    if (!fs.existsSync(labelsDir)) {
      fs.mkdirSync(labelsDir)
      console.log('Created labels directory')
    }

    // Generate PDF label
    const fileName = `label-${shipment._id}.pdf`
    const filePath = path.join(labelsDir, fileName)
    console.log('Generating PDF at:', filePath)

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
    console.log('PDF generation started')

    // Update shipment with labelPath when PDF is done
    writeStream.on('finish', async () => {
      console.log('PDF write finished, updating shipment...')
      try {
        shipment.labelPath = `http://localhost:4000/labels/${fileName}`
        await shipment.save()
        console.log('Shipment updated with labelPath')
      } catch (saveErr) {
        console.error('Error saving labelPath:', saveErr)
      }
    })

    writeStream.on('error', (err) => {
      console.error('PDF write error:', err)
    })
  } catch (err) {
    console.error('Background PDF generation error:', err)
  }
}

module.exports = router
