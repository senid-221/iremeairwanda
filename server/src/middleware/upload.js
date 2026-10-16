var multer = require('multer');
var path = require('path');
var fs = require('fs');

var uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

var cvDir = path.join(uploadDir, 'cvs');
if (!fs.existsSync(cvDir)) {
  fs.mkdirSync(cvDir, { recursive: true });
}

var faceDir = path.join(uploadDir, 'faces');
if (!fs.existsSync(faceDir)) {
  fs.mkdirSync(faceDir, { recursive: true });
}

var cvStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, cvDir);
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname);
    cb(null, 'cv-' + req.user.id + '-' + Date.now() + ext);
  }
});

var faceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, faceDir);
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname);
    cb(null, 'face-' + req.user.id + '-' + Date.now() + ext);
  }
});

var cvFileFilter = function (req, file, cb) {
  var allowed = ['.pdf', '.doc', '.docx'];
  var ext = path.extname(file.originalname).toLowerCase();
  if (allowed.indexOf(ext) !== -1) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

var faceFileFilter = function (req, file, cb) {
  var allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  var ext = path.extname(file.originalname).toLowerCase();
  if (allowed.indexOf(ext) !== -1) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'), false);
  }
};

var uploadCV = multer({
  storage: cvStorage,
  fileFilter: cvFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('cv');

var uploadFace = multer({
  storage: faceStorage,
  fileFilter: faceFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
}).single('face');

module.exports = {
  uploadCV: uploadCV,
  uploadFace: uploadFace
};
