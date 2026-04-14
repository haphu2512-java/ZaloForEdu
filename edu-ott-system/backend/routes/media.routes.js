const express = require('express');
const multer = require('multer');
const path = require('node:path');
const crypto = require('node:crypto');

const mediaController = require('../controllers/mediaController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  cloudinarySignatureSchema,
  mediaIdParamSchema,
  registerCloudinaryMediaSchema,
  uploadMediaSchema,
} = require('../validators/mediaSchemas');

const router = express.Router();

// Multer config — lưu vào uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

/**
 * @openapi
 * /media/upload:
 *   post:
 *     tags: [Media]
 *     summary: Upload media (base64 payload)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UploadMediaInput'
 *     responses:
 *       201:
 *         description: Media uploaded
 */
router.post('/upload', auth, validate({ body: uploadMediaSchema }), mediaController.uploadMedia);
router.post('/upload-form', auth, upload.single('file'), mediaController.uploadMediaForm);
/**
 * @openapi
 * /media/cloudinary/signature:
 *   post:
 *     tags: [Media]
 *     summary: Generate Cloudinary signed upload params for frontend direct upload
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CloudinarySignatureInput'
 *     responses:
 *       200:
 *         description: Cloudinary signature generated
 */
router.post(
  '/cloudinary/signature',
  auth,
  validate({ body: cloudinarySignatureSchema }),
  mediaController.getCloudinarySignature,
);
/**
 * @openapi
 * /media/cloudinary/register:
 *   post:
 *     tags: [Media]
 *     summary: Register uploaded Cloudinary file metadata into database
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterCloudinaryMediaInput'
 *     responses:
 *       201:
 *         description: Cloudinary media registered
 */
router.post(
  '/cloudinary/register',
  auth,
  validate({ body: registerCloudinaryMediaSchema }),
  mediaController.registerCloudinaryMedia,
);
/**
 * @openapi
 * /media/{id}:
 *   get:
 *     tags: [Media]
 *     summary: Get media metadata by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media fetched
 */
/**
 * @openapi
 * /media/my:
 *   get:
 *     tags: [Media]
 *     summary: Get authenticated user's uploaded media list
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: My media list fetched
 */
router.get('/my', auth, mediaController.getMyMedia);
router.get('/:id', auth, validate({ params: mediaIdParamSchema }), mediaController.getMediaById);
/**
 * @openapi
 * /media/{id}:
 *   delete:
 *     tags: [Media]
 *     summary: Delete media by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media deleted
 */
router.delete('/:id', auth, validate({ params: mediaIdParamSchema }), mediaController.deleteMediaById);

module.exports = router;
