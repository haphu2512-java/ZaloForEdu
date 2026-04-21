const express = require('express');

const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const communityController = require('../controllers/communityController');
const { loadCommunityMember, requireCommunityRoles, requireCommunityManageMembers } = require('../middlewares/communityRoles');
const {
  communityIdParamSchema,
  createCommunitySchema,
  joinCommunitySchema,
  approveJoinSchema,
} = require('../validators/communitySchemas');

const router = express.Router();

router.post('/', auth, validate({ body: createCommunitySchema }), communityController.createCommunity);
router.get('/:id', auth, validate({ params: communityIdParamSchema }), communityController.getCommunityById);
router.post('/:id/join', auth, validate({ params: communityIdParamSchema, body: joinCommunitySchema }), communityController.joinCommunity);
router.post(
  '/:id/approve',
  auth,
  validate({ params: communityIdParamSchema, body: approveJoinSchema }),
  ...requireCommunityManageMembers,
  communityController.approveCommunityJoin,
);
router.delete(
  '/:id',
  auth,
  validate({ params: communityIdParamSchema }),
  loadCommunityMember,
  requireCommunityRoles(['owner']),
  communityController.disbandCommunity,
);

module.exports = router;
