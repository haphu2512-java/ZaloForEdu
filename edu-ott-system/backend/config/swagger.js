const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Zalo Clone - OTT Messaging Platform API',
      version: '2.0.0',
      description: 'Complete REST API documentation for authentication, users, messaging, friends, conversations, media, notifications, search, settings and chatbot.',
      contact: {
        name: 'Development Team',
        url: 'https://github.com/ZaloClone',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local Development Server',
        variables: {
          protocol: {
            default: 'http',
          },
          host: {
            default: 'localhost:5000',
          },
        },
      },
      {
        url: 'https://api.example.com/api/v1',
        description: 'Production Server',
      },
    ],
    tags: [
      { name: 'Auth' },
      { name: 'Users' },
      { name: 'Friends' },
      { name: 'Conversations' },
      { name: 'Messages' },
      { name: 'Media' },
      { name: 'Notifications' },
      { name: 'Search' },
      { name: 'Settings' },
      { name: 'ChatBot' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      parameters: {
        ClientPlatform: {
          in: 'header',
          name: 'x-client-platform',
          required: false,
          schema: {
            type: 'string',
            enum: ['web', 'ios', 'android', 'desktop', 'unknown'],
          },
          description: 'Client platform identifier.',
        },
        AppVersion: {
          in: 'header',
          name: 'x-app-version',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'Version of web/mobile app.',
        },
        DeviceId: {
          in: 'header',
          name: 'x-device-id',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'Device identifier for session tracing.',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string', example: 'OK' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid payload' },
                details: { type: 'object', nullable: true },
              },
            },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['password'],
          oneOf: [{ required: ['email'] }, { required: ['phone'] }],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6, maxLength: 100 },
            phone: { type: 'string', minLength: 8, maxLength: 20, nullable: true },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['password'],
          oneOf: [{ required: ['email'] }, { required: ['username'] }, { required: ['phone'] }],
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3, maxLength: 50 },
            phone: { type: 'string', minLength: 8, maxLength: 20 },
            password: { type: 'string', minLength: 6, maxLength: 100 },
          },
        },
        RefreshInput: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        VerifyEmailInput: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
          },
        },
        ForgotPasswordInput: {
          type: 'object',
          oneOf: [{ required: ['email'] }, { required: ['phone'] }],
          properties: {
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', minLength: 8, maxLength: 20 },
          },
        },
        ResetPasswordInput: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string', minLength: 10 },
            newPassword: { type: 'string', minLength: 6, maxLength: 100 },
          },
        },
        ChangePasswordInput: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', minLength: 6, maxLength: 100 },
            newPassword: { type: 'string', minLength: 6, maxLength: 100 },
          },
        },
        UpdateUserInput: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            phone: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        BlockUserInput: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['block', 'unblock'], default: 'block' },
          },
        },
        FriendRequestInput: {
          type: 'object',
          required: ['toUserId'],
          properties: {
            toUserId: { type: 'string' },
          },
        },
        ConversationInput: {
          type: 'object',
          required: ['participantIds'],
          properties: {
            type: { type: 'string', enum: ['direct', 'group'], default: 'direct' },
            name: { type: 'string' },
            participantIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        SendMessageInput: {
          type: 'object',
          required: ['conversationId'],
          properties: {
            conversationId: { type: 'string' },
            content: { type: 'string', default: '' },
            mediaIds: {
              type: 'array',
              items: { type: 'string' },
              default: [],
            },
            replyTo: { type: 'string' },
            forwardFrom: { type: 'string' },
          },
        },
        UpdateGroupNameInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120, example: 'Nhóm lớp 12A1' },
          },
        },
        AddGroupMembersInput: {
          type: 'object',
          required: ['memberIds'],
          properties: {
            memberIds: {
              type: 'array',
              minItems: 1,
              items: { type: 'string' },
              example: ['661d7e5d00f1e0a67ea9b111', '661d7e5d00f1e0a67ea9b222'],
            },
          },
        },
        TransferGroupOwnerInput: {
          type: 'object',
          required: ['newOwnerId'],
          properties: {
            newOwnerId: { type: 'string', example: '661d7e5d00f1e0a67ea9b333' },
          },
        },
        AskChatbotInput: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', maxLength: 2000, example: 'Hướng dẫn tạo nhóm giúp mình' },
          },
        },
        UpdateSettingsInput: {
          type: 'object',
          properties: {
            theme: { type: 'string', enum: ['light', 'dark', 'system'] },
            notifications: {
              type: 'object',
              properties: {
                pushEnabled: { type: 'boolean' },
                messageEnabled: { type: 'boolean' },
                groupEnabled: { type: 'boolean' },
                soundEnabled: { type: 'boolean' },
              },
            },
          },
        },
        UploadMediaInput: {
          type: 'object',
          required: ['fileName', 'mimeType', 'contentBase64'],
          properties: {
            fileName: { type: 'string' },
            mimeType: { type: 'string' },
            contentBase64: { type: 'string' },
          },
        },
        CloudinarySignatureInput: {
          type: 'object',
          properties: {
            folder: { type: 'string' },
            publicId: { type: 'string' },
            resourceType: { type: 'string', enum: ['image', 'video', 'raw', 'auto'] },
          },
        },
        RegisterCloudinaryMediaInput: {
          type: 'object',
          required: ['fileName', 'mimeType', 'size', 'url', 'publicId'],
          properties: {
            fileName: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'integer' },
            url: { type: 'string', format: 'uri' },
            publicId: { type: 'string' },
            resourceType: { type: 'string', enum: ['image', 'video', 'raw', 'auto'], default: 'auto' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have permission for this resource',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        ConflictError: {
          description: 'Resource conflict',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },
  // Load all endpoint and schema documentation from routes folder
  // Format: ['path/to/files/*.js']
  // Picks up:
  //   - auth.routes.js, user.routes.js, etc.
  //   - swagger.endpoints.js (comprehensive endpoint documentation)
  //   - swagger.schemas.js (comprehensive schema definitions)
  apis: ['./routes/*.js'],
};

// Generate Swagger specification from JSDoc comments
module.exports = swaggerJsdoc(options);
