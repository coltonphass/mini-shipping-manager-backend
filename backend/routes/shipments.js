const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

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
        // Hardcoded to deployed backend
        shipment.labelPath = `https://mini-shipping-manager-backend.onrender.com/labels/${fileName}`
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

// Merge last 5 PDFs (Node.js method)
const { PDFDocument: PDFLibDocument } = require('pdf-lib')
router.get('/merge-last-5', async (req, res) => {
  try {
    const labelsDir = path.join(__dirname, '../labels')
    const files = fs
      .readdirSync(labelsDir)
      .filter((f) => f.toLowerCase().endsWith('.pdf'))
      .sort()

    const lastFive = files.slice(-5)
    if (lastFive.length === 0) {
      return res.status(400).json({ error: 'No PDF files to merge' })
    }

    const mergedPdf = await PDFLibDocument.create()

    for (const fileName of lastFive) {
      const pdfBytes = fs.readFileSync(path.join(labelsDir, fileName))
      const pdf = await PDFLibDocument.load(pdfBytes)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => mergedPdf.addPage(page))
    }

    const mergedBytes = await mergedPdf.save()
    const mergedPath = path.join(labelsDir, 'merged_labels.pdf')
    fs.writeFileSync(mergedPath, mergedBytes)

    res.download(mergedPath, 'merged_labels.pdf', (err) => {
      if (err) console.error(err)
      else console.log('Merged PDF sent to client')
    })
  } catch (err) {
    console.error('Failed to merge PDFs:', err)
    res.status(500).json({ error: 'Failed to merge PDFs' })
  }
})

module.exports = router

