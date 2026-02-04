const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');

const fileController = {
  uploadFile: (req, res) => res.json({ message: 'Upload file' }),
  getFile: (req, res) => res.json({ message: 'Get file' }),
  deleteFile: (req, res) => res.json({ message: 'Delete file' }),
};

router.use(protect);

router.post('/upload', fileController.uploadFile);
router.get('/:id', fileController.getFile);
router.delete('/:id', fileController.deleteFile);

module.exports = router;
