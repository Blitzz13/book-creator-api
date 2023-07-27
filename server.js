require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bookRoutes = require("./routes/books");
const chapterRoutes = require("./routes/chapters");
const userRoutes = require("./routes/users");
const noteRoutes = require("./routes/notes");

//Express app
const app = express();

//Middleware
app.use(express.json({limit: "10mb"}));

app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
});

//Routes
app.use("/api/books", bookRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notes", noteRoutes);

//Connect to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Connected to DB and listening localhost:${process.env.PORT}`);
        });

        // app.listen(process.env.PORT, process.env.HOST_NAME, () =>{
        //     console.log(`Connected to DB and listening on ${process.env.HOST_NAME}:${process.env.PORT}`);
        // });
    })
    .catch((error) => {
        console.error(error)
    });