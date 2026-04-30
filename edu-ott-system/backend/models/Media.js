const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      default: null,
      // Duration in seconds for audio/video files
    },
    storage: {
      type: String,
      enum: ['local', 'cloudinary', 's3'],
      default: 'local',
    },
    url: {
      type: String,
      required: true,
    },
    providerPublicId: {
      type: String,
      default: null,
    },
    providerResourceType: {
      type: String,
      enum: ['image', 'video', 'raw', 'auto'],
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Media', mediaSchema);
