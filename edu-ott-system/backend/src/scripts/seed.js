const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Group = require('../models/Group');
const Message = require('../models/Message');
const mockData = require('./mockData');

/**
 * Seeding Script
 * Run with: node backend/src/scripts/seed.js
 */

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Missing MONGODB_URI in backend/.env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected.');

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Class.deleteMany({});
    await Group.deleteMany({});
    await Message.deleteMany({});
    console.log('Data cleared.');

    // 1. Insert Users
    console.log(`Inserting ${mockData.users.length} users...`);
    const createdUsers = await User.insertMany(mockData.users);
    console.log('Users created.');

    // Group users by roles
    const admin = createdUsers.find(u => u.role === 'admin');
    const teachers = createdUsers.filter(u => u.role === 'teacher');
    const students = createdUsers.filter(u => u.role === 'student');

    if (!teachers.length || !students.length) {
      throw new Error('Not enough teachers or students in mock data!');
    }

    // 2. Insert Classes
    console.log(`Inserting ${mockData.classes.length} classes...`);
    const classesToCreate = mockData.classes.map((cls, index) => {
      // Assign a teacher (round-robin)
      const teacher = teachers[index % teachers.length]._id;
      // Assign random chunk of students (approx 5-10 students per class)
      const shuffledStudents = students.sort(() => 0.5 - Math.random());
      const enrolledStudents = shuffledStudents.slice(0, Math.floor(Math.random() * 5) + 5).map(s => s._id);

      return {
        ...cls,
        teacher,
        students: enrolledStudents,
        maxStudents: 50,
        status: 'active',
        settings: {
          allowStudentPost: true,
          allowFileUpload: true,
          requireApproval: false
        }
      };
    });

    const createdClasses = await Class.insertMany(classesToCreate);
    console.log('Classes created.');

    // 3. Insert Groups for some classes
    console.log('Creating Groups...');
    const groupsToCreate = [];
    createdClasses.forEach(cls => {
      // Create 2 groups per class
      if (cls.students.length > 2) {
        // Group 1
        groupsToCreate.push({
          name: 'Nhóm Thuyết Trình',
          description: 'Nhóm chuẩn bị slide thuyết trình giữa kỳ',
          class: cls._id,
          members: cls.students.slice(0, 3).map((s, i) => ({ user: s, role: i === 0 ? 'leader' : 'member', joinedAt: new Date() })),
          createdBy: cls.teacher,
          isActive: true
        });
        
        // Group 2
        groupsToCreate.push({
          name: 'Nhóm Đồ Án',
          description: 'Thảo luận về đồ án môn học',
          class: cls._id,
          members: cls.students.slice(-3).map((s, i) => ({ user: s, role: i === 0 ? 'leader' : 'member', joinedAt: new Date() })),
          createdBy: cls.teacher,
          isActive: true
        });
      }
    });

    const createdGroups = await Group.insertMany(groupsToCreate);
    console.log(`${createdGroups.length} Groups created.`);

    console.log('----- SEEDING COMPLETE -----');
    console.log(`- Created ${createdUsers.length} Users (Use email + password: '123456' to login, e.g. admin: ${admin?.email || 'N/A'})`);
    console.log(`- Created ${createdClasses.length} Classes`);
    console.log(`- Created ${createdGroups.length} Groups`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedDatabase();
