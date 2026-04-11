/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: mongoid
 *         id:
 *           type: string
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *           pattern: '^\+?\d{8,15}$'
 *           nullable: true
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         friends:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of friend user IDs
 *         blockedUsers:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of blocked user IDs
 *         isOnline:
 *           type: boolean
 *         lastSeen:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         isEmailVerified:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "605c72b8c1234567890abcde"
 *         username: "john_doe"
 *         email: "john@example.com"
 *         phone: "+84912345678"
 *         avatarUrl: "https://example.com/avatar.jpg"
 *         friends: ["605c72b8c1234567890abcd1", "605c72b8c1234567890abcd2"]
 *         blockedUsers: []
 *         isOnline: true
 *         lastSeen: "2026-04-10T10:30:00Z"
 *         isEmailVerified: true
 *         createdAt: "2026-01-01T00:00:00Z"
 *         updatedAt: "2026-04-10T10:30:00Z"
 *
 *     Conversation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [direct, group]
 *         name:
 *           type: string
 *           nullable: true
 *           description: Group name (only for group conversations)
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         createdBy:
 *           type: string
 *           description: User ID who created conversation
 *         ownerId:
 *           type: string
 *           description: Group owner ID (only for group)
 *         adminIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of admin IDs (only for group)
 *         lastMessageAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         latestMessage:
 *           $ref: '#/components/schemas/Message'
 *           nullable: true
 *           description: Latest message in conversation
 *         preference:
 *           type: object
 *           description: User's preference for this conversation
 *           nullable: true
 *           properties:
 *             category:
 *               type: string
 *               enum: [primary, work, family, other]
 *             nickname:
 *               type: string
 *               nullable: true
 *             isHidden:
 *               type: boolean
 *             isDeleted:
 *               type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         id:
 *           type: string
 *         conversationId:
 *           type: string
 *         senderId:
 *           type: object
 *           description: Sender information
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *             avatarUrl:
 *               type: string
 *               nullable: true
 *         content:
 *           type: string
 *           maxLength: 5000
 *         mediaIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of media IDs attached
 *         replyTo:
 *           type: string
 *           nullable: true
 *           description: ID of message being replied to
 *         forwardFrom:
 *           type: string
 *           nullable: true
 *           description: ID of message being forwarded
 *         deliveredTo:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who received message
 *         seenBy:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who read message
 *         isRecalled:
 *           type: boolean
 *           description: Whether message was recalled (unsent)
 *         deletedBy:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who deleted message
 *         reactions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               emoji:
 *                 type: string
 *           description: Array of reactions from users
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     FriendRequest:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         id:
 *           type: string
 *         fromUserId:
 *           $ref: '#/components/schemas/User'
 *         toUserId:
 *           $ref: '#/components/schemas/User'
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *         respondedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Media:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         id:
 *           type: string
 *         uploaderId:
 *           type: string
 *           description: ID of user who uploaded
 *         type:
 *           type: string
 *           enum: [image, video, audio, document]
 *         url:
 *           type: string
 *           format: uri
 *         cloudinaryPublicId:
 *           type: string
 *           nullable: true
 *         size:
 *           type: integer
 *           description: File size in bytes
 *         mimetype:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         type:
 *           type: string
 *           example: "message|friend_request|group_invite|system"
 *         title:
 *           type: string
 *           maxLength: 200
 *         body:
 *           type: string
 *           maxLength: 1000
 *         data:
 *           type: object
 *           nullable: true
 *           description: Additional notification data
 *         isRead:
 *           type: boolean
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     UserSettings:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         theme:
 *           type: string
 *           enum: [light, dark, system]
 *           default: system
 *         notifications:
 *           type: object
 *           properties:
 *             pushEnabled:
 *               type: boolean
 *               default: true
 *             messageEnabled:
 *               type: boolean
 *               default: true
 *             groupEnabled:
 *               type: boolean
 *               default: true
 *             soundEnabled:
 *               type: boolean
 *               default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     DefaultPropertiesObject:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *       required:
 *         - success
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: "USER_NOT_FOUND"
 *               description: Machine-readable error code
 *             message:
 *               type: string
 *               example: "User not found"
 *               description: Human-readable error message
 *             details:
 *               type: object
 *               nullable: true
 *               example: null
 *               description: Additional error details (validation errors, etc)
 *       required:
 *         - success
 *         - error
 *
 *   responses:
 *     UnauthorizedError:
 *       description: Access token is missing or invalid
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     ForbiddenError:
 *       description: User does not have permission for this action
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     NotFoundError:
 *       description: Requested resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     ConflictError:
 *       description: Resource conflict (e.g., email already exists)
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     ValidationError:
 *       description: Request validation failed
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */
