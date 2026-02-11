const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const classController = require('../controllers/classController'); 

router.use(protect);

router.get('/', classController.getAllClasses);
router.post('/', restrictTo('teacher', 'admin'), classController.createClass);
router.get('/:id', classController.getClass);
router.put('/:id', restrictTo('teacher', 'admin'), classController.updateClass);
router.delete('/:id', restrictTo('teacher', 'admin'), classController.deleteClass);
router.post('/:id/join', classController.joinClass);
router.post('/:id/leave', classController.leaveClass);
router.get('/:id/members', classController.getClassMembers);
router.get('/:id/invite', classController.getClassInvite);

module.exports = router;