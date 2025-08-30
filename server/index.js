const express = require('express');
const multer = require('multer');
const path = require('path');

const PORT = 3000;
const app = express();
const postRoute = require('./routes/post');

// Only use express.json() on routes that expect JSON!
app.use(express.json());

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });


app.use('/post', upload.array('images'), postRoute);

// Optional: serve uploaded images statically (for debugging)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log('Working directory:', process.cwd());
app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT);
});