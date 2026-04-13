const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/edu-ott-db';

const Class = require('./src/models/Class');
const Group = require('./src/models/Group');
const Conversation = require('./src/models/Conversation');
const Message = require('./src/models/Message');

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const teacherId = new mongoose.Types.ObjectId('69d294d489d07ebbcad5814a'); // Hahhaha
    const studentId = new mongoose.Types.ObjectId('69d2906b846340460d3e864b'); // Hà Phú
    
    const codeSuffix = Math.floor(Math.random() * 10000);
    // 1. Create a Class
    const cls = new Class({
      name: `Lập trình Web nâng cao ${codeSuffix}`,
      code: `WEB202-${codeSuffix}`,
      description: 'Lớp học lập trình Web với React và Node.js',
      subject: 'Công nghệ phần mềm',
      semester: 'Kỳ 2',
      academicYear: '2025-2026',
      teacher: teacherId,
      students: [studentId],
      maxStudents: 50,
      status: 'active',
      settings: {
        allowStudentPost: true,
        allowFileUpload: true,
        requireApproval: false
      }
    });
    await cls.save();
    console.log(`Created Class: ${cls.name}`);

    // 2. Create a Group in that class
    const group = new Group({
      name: 'Nhóm 1 - Đồ án cuối kỳ',
      description: 'Nhóm làm project edu-ott-system',
      class: cls._id,
      createdBy: teacherId,
      members: [
        { user: teacherId, role: 'leader', joinedAt: new Date() },
        { user: studentId, role: 'member', joinedAt: new Date() }
      ],
      maxMembers: 5,
      isActive: true
    });
    await group.save();
    console.log(`Created Group: ${group.name}`);

    // 3. Create a Private Conversation
    let conv = await Conversation.findOne({
      participants: { $all: [teacherId, studentId] }
    });

    if (!conv) {
      conv = new Conversation({
        participants: [teacherId, studentId],
        unreadCount: {
          [teacherId.toString()]: 0,
          [studentId.toString()]: 0
        }
      });
      await conv.save();
      console.log(`Created Conversation between Teacher and Student`);
    }

    // 4. Create some Messages

    // Class Message
    const msg1 = new Message({
      content: 'Chào mừng các bạn đến với lớp học Lập trình Web.',
      type: 'text',
      sender: teacherId,
      room: cls._id,
      roomModel: 'Class'
    });
    await msg1.save();
    // Usually LastMessage goes somewhere, but let's just make the message.

    // Group Message
    const msg2 = new Message({
      content: 'Hello sinh viên, đây là nhóm đồ án.',
      type: 'text',
      sender: teacherId,
      room: group._id,
      roomModel: 'Group' 
    });
    await msg2.save();

    // Private Message
    const msg3 = new Message({
      content: 'Em chào thầy ạ, e có thắc mắc về bài giảng.',
      type: 'text',
      sender: studentId,
      room: conv._id,
      roomModel: 'Conversation'
    });
    await msg3.save();
    conv.lastMessage = msg3._id;
    conv.unreadCount.set(teacherId.toString(), 1);
    await conv.save();

    console.log('Created Messages');
    
    console.log('Seeding Data complete!');
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    mongoose.connection.close();
  }
}

seedData();
