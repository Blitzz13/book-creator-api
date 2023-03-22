require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bookRoutes = require("./routes/books");

//Express app
const app = express();

//Middleware
app.use(express.json());

app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
});

//Routes
app.use("/api/books", bookRoutes);

//Connect to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Connected to DB and listening on port ${process.env.PORT}`);
        });
    })
    .catch((error) => {
        console.error(error)
    });