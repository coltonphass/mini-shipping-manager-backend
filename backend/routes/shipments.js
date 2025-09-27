const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

// MongoDB Shipment model
const shipmentSchema = new mongoose.Schema({
  recipient: { type: String, required: true },
  address: { type: String, required: true },
  weight: { type: Number, required: true },
  service: { type: String, required: true },
  labelPath: { type: String },
  createdAt: { type: Date, default: Date.now },
})
const Shipment = mongoose.model('Shipment', shipmentSchema)

// Backend URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

// GET last 5 shipments
router.get('/', async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ createdAt: -1 }).limit(5)
    res.json(shipments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST create shipment
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

// Merge last 5 PDFs
router.get('/merge-last-5', (req, res) => {
  const scriptPath = path.join(__dirname, '..', 'python', 'merge_pdfs.py')

  exec(`python3 "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Python error: ${error.message}`)
      return res.status(500).json({ error: 'Failed to merge PDFs' })
    }
    if (stderr) console.error(`Python stderr: ${stderr}`)
    console.log(stdout)

    const mergedFile = path.join(__dirname, '../labels/merged_labels.pdf')
    if (fs.existsSync(mergedFile)) {
      res.download(mergedFile, 'merged_labels.pdf', (err) => {
        if (err) console.error(err)
        else console.log('Merged PDF sent to client')
      })
    } else {
      res.status(500).json({ error: 'Merged PDF not found' })
    }
  })
})

module.exports = router
