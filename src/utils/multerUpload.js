const multer = require("multer");

// const storage = multer.memoryStorage();
// const multerUploads = multer({ storage }).single("image");

// module.exports = { multerUploads };

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const multerUploads = multer({ storage: storage });
module.exports = multerUploads;