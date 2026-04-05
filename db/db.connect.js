const mongoose = require("mongoose")
require("dotenv").config()

const mongoUri = process.env.MONGODB

const initializeDatabase = () => {
  mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected Successfully")
  }).catch((error) => {
   console.log("Error while connection to Database", error)
  })
}

module.exports = { initializeDatabase}