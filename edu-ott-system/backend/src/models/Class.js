const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Class code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    coverImage: {
      type: String,
      default: null,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
    },
    semester: {
      type: String,
      default: null,
    },
    academicYear: {
      type: String,
      default: null,
    },
    schedule: {
      dayOfWeek: {
        type: Number, // 0-6 (Sunday-Saturday)
        min: 0,
        max: 6,
      },
      startTime: String, // HH:mm format
      endTime: String,
      room: String,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required'],
    },
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    maxStudents: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
    },
    settings: {
      allowStudentPost: {
        type: Boolean,
        default: true,
      },
      allowFileUpload: {
        type: Boolean,
        default: true,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
classSchema.index({ code: 1 });
classSchema.index({ teacher: 1 });
classSchema.index({ status: 1 });
classSchema.index({ students: 1 });

// Virtual for student count
classSchema.virtual('studentCount').get(function () {
  return this.students ? this.students.length : 0;
});

// Virtual for groups in this class
classSchema.virtual('groups', {
  ref: 'Group',
  localField: '_id',
  foreignField: 'class',
});

module.exports = mongoose.model('Class', classSchema);
