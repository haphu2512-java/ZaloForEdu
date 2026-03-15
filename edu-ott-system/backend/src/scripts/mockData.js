const users = [
  {
    email: 'admin@edu.com',
    password: '123456',
    fullName: 'System Administrator',
    role: 'admin',
    avatar: 'https://i.pravatar.cc/150?u=admin@edu.com',
    bio: 'Platform administrator responsible for system maintenance and user management.'
  },
  {
    email: 'teacher.jones@edu.com',
    password: '123456',
    fullName: 'Robert Jones',
    role: 'teacher',
    avatar: 'https://i.pravatar.cc/150?u=teacher.jones@edu.com',
    bio: 'Senior Mathematics Professor with a passion for teaching calculus.'
  },
  {
    email: 'teacher.smith@edu.com',
    password: '123456',
    fullName: 'Maria Smith',
    role: 'teacher',
    avatar: 'https://i.pravatar.cc/150?u=teacher.smith@edu.com',
    bio: 'Computer Science instructor specializing in Web Development and AI.'
  },
  {
    email: 'teacher.wilson@edu.com',
    password: '123456',
    fullName: 'James Wilson',
    role: 'teacher',
    avatar: 'https://i.pravatar.cc/150?u=teacher.wilson@edu.com',
    bio: 'Physics lecturer focused on quantum mechanics and thermodynamics.'
  },
  {
    email: 'student.01@edu.com',
    password: '123456',
    fullName: 'Alice Johnson',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.01@edu.com',
    bio: 'Freshman student majoring in Software Engineering.'
  },
  {
    email: 'student.02@edu.com',
    password: '123456',
    fullName: 'Bob Brown',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.02@edu.com',
    bio: 'Sophomore student interested in Data Science.'
  },
  {
    email: 'student.03@edu.com',
    password: '123456',
    fullName: 'Charlie Davis',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.03@edu.com',
    bio: 'Junior student pursuing a degree in Mathematics.'
  },
  {
    email: 'student.04@edu.com',
    password: '123456',
    fullName: 'Diana Prince',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.04@edu.com',
    bio: 'Senior student looking to become a professional developer.'
  },
  {
    email: 'student.05@edu.com',
    password: '123456',
    fullName: 'Ethan Hunt',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.05@edu.com',
    bio: 'Enthusiastic learner focusing on cybersecurity.'
  },
  {
    email: 'student.06@edu.com',
    password: '123456',
    fullName: 'Fiona Gallagher',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.06@edu.com',
    bio: 'Passionate about structural engineering and design.'
  },
  {
    email: 'student.07@edu.com',
    password: '123456',
    fullName: 'George Costanza',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.07@edu.com',
    bio: 'Studying business administration with a minor in IT.'
  },
  {
    email: 'student.08@edu.com',
    password: '123456',
    fullName: 'Hannah Montana',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.08@edu.com',
    bio: 'Digital marketing student exploring social media trends.'
  },
  {
    email: 'student.09@edu.com',
    password: '123456',
    fullName: 'Ian Wright',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.09@edu.com',
    bio: 'Future backend engineer currently learning Node.js.'
  },
  {
    email: 'student.10@edu.com',
    password: '123456',
    fullName: 'Jenny Forrest',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.10@edu.com',
    bio: 'Environmental science student with a tech hobby.'
  },
  {
    email: 'student.11@edu.com',
    password: '123456',
    fullName: 'Kevin Hart',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.11@edu.com',
    bio: 'Always learning new things in the world of mobile apps.'
  },
  {
    email: 'student.12@edu.com',
    password: '123456',
    fullName: 'Laura Croft',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.12@edu.com',
    bio: 'Interested in archaeological history and digital archiving.'
  },
  {
    email: 'student.13@edu.com',
    password: '123456',
    fullName: 'Mike Ross',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.13@edu.com',
    bio: 'Law student taking technical courses to broaden horizons.'
  },
  {
    email: 'student.14@edu.com',
    password: '123456',
    fullName: 'Nina Williams',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.14@edu.com',
    bio: 'Graphic design student focusing on UI/UX.'
  },
  {
    email: 'student.15@edu.com',
    password: '123456',
    fullName: 'Oscar Isaac',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.15@edu.com',
    bio: 'Cinema and media studies student.'
  },
  {
    email: 'student.16@edu.com',
    password: '123456',
    fullName: 'Peter Parker',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=student.16@edu.com',
    bio: 'Science student with an interest in photography.'
  }
];

const classes = [
  {
    name: 'Introduction to Computer Science',
    code: 'CS101',
    subject: 'Computer Science',
    semester: '1',
    academicYear: '2025-2026',
    description: 'Foundational concepts of programming, algorithms, and data structures.'
  },
  {
    name: 'Advanced Calculus',
    code: 'MATH301',
    subject: 'Mathematics',
    semester: '2',
    academicYear: '2025-2026',
    description: 'In-depth study of limits, derivatives, integrals, and infinite series.'
  },
  {
    name: 'Modern Web Development',
    code: 'CS205',
    subject: 'Computer Science',
    semester: '1',
    academicYear: '2025-2026',
    description: 'Building responsive and dynamic web applications using React and Node.js.'
  },
  {
    name: 'Classical Mechanics',
    code: 'PHYS201',
    subject: 'Physics',
    semester: '1',
    academicYear: '2025-2026',
    description: 'The study of motion of macroscopic objects and the forces that affect them.'
  },
  {
    name: 'Artificial Intelligence Ethics',
    code: 'ETHICS402',
    subject: 'Philosophy/CS',
    semester: '2',
    academicYear: '2025-2026',
    description: 'Exploring the moral and social implications of AI and machine learning.'
  }
];

module.exports = {
  users,
  classes
};
