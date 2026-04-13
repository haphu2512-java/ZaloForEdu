const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'File name is required'],
    },
    filename: {
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
    url: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      enum: ['document', 'image', 'video', 'audio', 'other'],
      default: 'other',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Where the file belongs to
    room: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'roomModel',
      default: null,
    },
    roomModel: {
      type: String,
      enum: ['Class', 'Group', 'Conversation'],
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ room: 1, roomModel: 1 });
fileSchema.index({ category: 1 });
fileSchema.index({ createdAt: -1 });

// Virtual for human-readable file size
fileSchema.virtual('formattedSize').get(function () {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(this.size) / Math.log(1024)));
  return Math.round(this.size / Math.pow(1024, i), 2) + ' ' + sizes[i];
});

module.exports = mongoose.model('File', fileSchema);
