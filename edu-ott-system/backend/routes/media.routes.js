const express = require('express');

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
