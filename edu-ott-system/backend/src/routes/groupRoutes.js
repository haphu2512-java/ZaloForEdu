const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');

const groupController = {
  getAllGroups: (req, res) => res.json({ message: 'Get all groups' }),
  createGroup: (req, res) => res.json({ message: 'Create group' }),
  getGroup: (req, res) => res.json({ message: 'Get group by ID' }),
  updateGroup: (req, res) => res.json({ message: 'Update group' }),
  deleteGroup: (req, res) => res.json({ message: 'Delete group' }),
};

router.use(protect);

router.route('/')
  .get(groupController.getAllGroups)
  .post(groupController.createGroup);

router.route('/:id')
  .get(groupController.getGroup)
  .put(groupController.updateGroup)
  .delete(groupController.deleteGroup);

module.exports = router;
