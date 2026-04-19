const mongoose = require("mongoose")
require("dotenv").config()

const mongoUri = process.env.MONGODB

const initializeDatabase = () => {
  mongoose
  .connect(mongoUri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000, 
    retryWrites: true,    
    retryReads: true
  })
  .then(() => {
    console.log("Connected Successfully")
  }).catch((error) => {
   console.log("Error while connection to Database", error)
  })
}

module.exports = { initializeDatabase}