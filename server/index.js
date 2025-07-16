const express = require('express')
const multer = require('multer')
const PORT = 3000
const app = express()
const postRoute = require('./routes/post')
const {post} = require("axios");
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});


app.use(express.json())

const upload = multer({storage})

app.use('/post', upload.array('images'), postRoute)



console.log('Working directory:', process.cwd());
app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT);
});


