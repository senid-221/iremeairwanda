var fs = require('fs');
var path = require('path');
var pdfParse = require('pdf-parse');
var mammoth = require('mammoth');

var CVParser = {
  parsePDF: function(filePath) {
    return new Promise(function(resolve, reject) {
      var dataBuffer = fs.readFileSync(filePath);
      pdfParse(dataBuffer).then(function(data) {
        resolve({
          text: data.text,
          pages: data.numpages,
          info: data.info
        });
      }).catch(function(err) {
        reject(err);
      });
    });
  },

  parseDOCX: function(filePath) {
    return new Promise(function(resolve, reject) {
      mammoth.extractRawText({path: filePath})
        .then(function(result) {
          resolve({
            text: result.value,
            pages: null,
            info: {}
          });
        })
        .catch(function(err) {
          reject(err);
        });
    });
  },

  parse: function(filePath) {
    var ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      return this.parsePDF(filePath);
    } else if (ext === '.docx' || ext === '.doc') {
      return this.parseDOCX(filePath);
    } else {
      return Promise.reject(new Error('Unsupported file format: ' + ext));
    }
  }
};

module.exports = CVParser;
