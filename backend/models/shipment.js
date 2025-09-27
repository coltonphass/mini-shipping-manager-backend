const mongoose = require('mongoose')

const shipmentSchema = new mongoose.Schema({
  recipient: { type: String, required: true },
  address: { type: String, required: true },
  weight: { type: Number, required: true },
  service: { type: String, required: true }, // Added missing service field
  labelPath: { type: String }, // Added labelPath field
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Shipment', shipmentSchema)
