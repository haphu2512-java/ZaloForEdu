const fs = require('fs');
const path = require('path');

const filesToFix = [
  'frontend/web/src/pages/chat/MessageBubble.jsx',
  'frontend/web/src/pages/chat/ChatRightPanel.jsx',
  'frontend/web/src/pages/chat/useChatSocket.jsx',
  'frontend/web/src/pages/chat/Modals/ShareMessageModal.jsx',
  'frontend/web/src/pages/chat/ReminderListPage.jsx',
  'frontend/web/src/pages/admin/AdminProfileSettings.jsx',
  'frontend/web/src/pages/admin/UserManagement.jsx',
  'frontend/web/src/pages/profile/ProfilePage.jsx',
  'frontend/web/src/pages/cloud/MyDocumentsPage.jsx'
];

filesToFix.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('import { DEFAULT_AVATAR }') && !content.includes('const DEFAULT_AVATAR =')) {
    const fileDepth = file.split('/').length - 4; // frontend/web/src is 3
    let relativePath = '';
    if (fileDepth === 0) relativePath = './utils/constants';
    else {
      relativePath = '../'.repeat(fileDepth) + 'utils/constants';
    }
    
    const importStmt = `import { DEFAULT_AVATAR } from '${relativePath}';\n`;
    
    // Find the last import statement or insert at the top
    const importMatches = [...content.matchAll(/^import .*$/gm)];
    if (importMatches.length > 0) {
      const lastMatch = importMatches[importMatches.length - 1];
      const idx = lastMatch.index + lastMatch[0].length;
      content = content.slice(0, idx) + '\n' + importStmt + content.slice(idx);
    } else {
      content = importStmt + content;
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed import in', file);
  }
});
