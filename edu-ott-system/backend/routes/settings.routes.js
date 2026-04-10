const express = require('express');

const settingsController = require('../controllers/settingsController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { updateSettingsSchema } = require('../validators/settingsSchemas');

const router = express.Router();

/**
 * @openapi
 * /settings/me:
 *   get:
 *     tags: [Settings]
 *     summary: Get current user's settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings fetched
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', auth, settingsController.getMySettings);
/**
 * @openapi
 * /settings/me:
 *   put:
 *     tags: [Settings]
 *     summary: Update current user's settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSettingsInput'
 *     responses:
 *       200:
 *         description: User settings updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/me', auth, validate({ body: updateSettingsSchema }), settingsController.updateMySettings);

module.exports = router;
