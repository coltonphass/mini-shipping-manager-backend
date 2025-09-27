const express = require('express')
const router = express.Router()
const Shipment = require('../models/shipment')
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

// Helper: get backend base URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

// GET /api/shipments
router.get('/', async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ createdAt: -1 })
    res.json(shipments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/shipments
router.post('/', async (req, res) => {
  try {
    const { recipient, address, weight, service } = req.body
    if (!recipient || !address || !weight || !service) {
      return res
        .status(400)
        .json({ error: 'recipient, address, weight, and service are required' })
    }

    const shipment = new Shipment({ recipient, address, weight, service })
    await shipment.save()

    res.json(shipment)

    // Generate PDF in background
    generatePDFInBackground(shipment, recipient, address, weight, service)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

function generatePDFInBackground(
  shipment,
  recipient,
  address,
  weight,
  service
) {
  try {
    const labelsDir = path.join(__dirname, '../labels')
    if (!fs.existsSync(labelsDir)) fs.mkdirSync(labelsDir)

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

    writeStream.on('finish', async () => {
      try {
        // Use backend URL dynamically
        shipment.labelPath = `${BACKEND_URL}/labels/${fileName}`
        await shipment.save()
      } catch (err) {
        console.error('Error updating labelPath:', err)
      }
    })

    writeStream.on('error', (err) => console.error('PDF write error:', err))
  } catch (err) {
    console.error('PDF generation error:', err)
  }
}

module.exports = router
