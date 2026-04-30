const express = require('express');
const auth = require('../middlewares/auth');
const { createPost, getFeed, getUserPosts, getPostById, updatePost, deletePost } = require('../controllers/postController');
const { createComment, getComments, deleteComment } = require('../controllers/commentController');
const { toggleReaction, getReactions } = require('../controllers/reactionController');

const router = express.Router();

// All social routes require authentication
router.use(auth);

// ==================== POSTS ====================
router.post('/posts', createPost);
router.get('/posts/feed', getFeed);
router.get('/posts/user/:userId', getUserPosts);
router.get('/posts/:postId', getPostById);
router.put('/posts/:postId', updatePost);
router.delete('/posts/:postId', deletePost);

// ==================== COMMENTS ====================
router.post('/posts/:postId/comments', createComment);
router.get('/posts/:postId/comments', getComments);
router.delete('/posts/:postId/comments/:commentId', deleteComment);

// ==================== REACTIONS ====================
router.put('/reactions', toggleReaction);
router.get('/reactions/:targetType/:targetId', getReactions);

module.exports = router;
