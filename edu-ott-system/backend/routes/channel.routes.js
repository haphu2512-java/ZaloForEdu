const express = require('express');

const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const channelController = require('../controllers/channelController');
const { createChannelSchema, communityChannelParamSchema } = require('../validators/channelSchemas');
const { loadCommunityMember, requireCommunityRoles } = require('../middlewares/communityRoles');

const router = express.Router();

router.post('/', auth, validate({ body: createChannelSchema }), loadCommunityMember, requireCommunityRoles(['admin']), channelController.createChannel);
router.get('/:communityId', auth, validate({ params: communityChannelParamSchema }), loadCommunityMember, channelController.listChannelsByCommunity);

module.exports = router;
