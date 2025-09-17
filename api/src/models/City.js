const mongoose = require('mongoose');    
    
const CitySchema = new mongoose.Schema({    
  name: { type: String, required: true, unique: true },    
  code: { type: String, required: true, unique: true },    
  actif: { type: Boolean, default: true }    
}, { timestamps: true });    
  
CitySchema.index({ name: 1 });  
CitySchema.index({ code: 1 });  
CitySchema.index({ actif: 1 });  
    
module.exports = mongoose.model('City', CitySchema);