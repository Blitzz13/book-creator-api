const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const attachUser = async (req, res, next) => {
    const { authorization } = req.headers;

    if (authorization) {
        const token = authorization.split(" ")[1];
        try {
            const { _id } = jwt.verify(token, process.env.SECRET);
            req.user = await User.findOne({ _id }).select("_id");
        } catch (error) {
            console.log("Not logged in user");
        }
       
    }

    next();
}

module.exports = attachUser;