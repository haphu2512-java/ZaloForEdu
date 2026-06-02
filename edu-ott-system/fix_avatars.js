const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('frontend/web/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let needsImport = false;
  
  // Replace all pravatar variations
  if (/https:\/\/i\.pravatar\.cc\/[^\s'"]+/.test(content)) {
    content = content.replace(/['"`]https:\/\/i\.pravatar\.cc\/[^\s'"`]+['"`]/g, 'DEFAULT_AVATAR');
    needsImport = true;
  }
  
  // Replace all ui-avatars variations
  if (/https:\/\/ui-avatars\.com\/api\/\?[^\s'"`]+/.test(content)) {
    content = content.replace(/['"`]https:\/\/ui-avatars\.com\/api\/\?[^\s'"`]+['"`]/g, 'DEFAULT_AVATAR');
    needsImport = true;
  }

  // If replaced, we need to import DEFAULT_AVATAR if not already imported
  if (needsImport && !content.includes('DEFAULT_AVATAR')) {
    // wait, if it's already defined locally (like in ChatPage.jsx), we don't import.
    // If it's not defined or imported...
    
    // Calculate relative path to utils/constants
    const fileDepth = file.split('/').length - 4; // frontend/web/src is 3
    let relativePath = '';
    if (fileDepth === 0) relativePath = './utils/constants';
    else {
      relativePath = '../'.repeat(fileDepth) + 'utils/constants';
    }
    
    const importStmt = `import { DEFAULT_AVATAR } from '${relativePath}';\n`;
    
    // Insert after the last import, or at the top
    const lastImportMatch = [...content.matchAll(/^import .*;$/gm)].pop();
    if (lastImportMatch) {
      const idx = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, idx) + '\n' + importStmt + content.slice(idx);
    } else {
      content = importStmt + content;
    }
  }

  // If it was already defined locally but we replaced strings with the constant name, we don't need to import if it's defined.
  // Actually, some files define DEFAULT_AVATAR locally. Let's just remove the local definition and use the import everywhere.
  if (needsImport || content.includes('const DEFAULT_AVATAR = "data:image/svg+xml')) {
    if (content.includes('const DEFAULT_AVATAR = "data:image/svg+xml')) {
      content = content.replace(/const DEFAULT_AVATAR = "data:image\/svg\+xml.*";\n?/g, '');
      
      const fileDepth = file.split('/').length - 4;
      let relativePath = '';
      if (fileDepth === 0) relativePath = './utils/constants';
      else {
        relativePath = '../'.repeat(fileDepth) + 'utils/constants';
      }
      
      if (!content.includes('DEFAULT_AVATAR } from')) {
        const importStmt = `import { DEFAULT_AVATAR } from '${relativePath}';\n`;
        const lastImportMatch = [...content.matchAll(/^import .*;$/gm)].pop();
        if (lastImportMatch) {
          const idx = lastImportMatch.index + lastImportMatch[0].length;
          content = content.slice(0, idx) + '\n' + importStmt + content.slice(idx);
        } else {
          content = importStmt + content;
        }
      }
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
