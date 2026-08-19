#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixAuditCalls(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern to match writeAudit calls
  const writeAuditPattern = /writeAudit\s*\(\s*\{([^}]+)\}/gs;
  
  content = content.replace(writeAuditPattern, (match, insideObject) => {
    let fields = insideObject.trim();
    let hasUserid = fields.includes('user_id:');
    let hasResourceId = fields.includes('resource_id:');
    
    // Skip if both required fields are present
    if (hasUserid && hasResourceId) {
      return match;
    }
    
    let newFields = [];
    
    // Add user_id if missing
    if (!hasUserid) {
      const defaultUserId = fields.includes('session_id: \'system\'') || fields.includes('session_id: "system"') ? '\'system\'' : '\'guest\'';
      newFields.push(`user_id: ${defaultUserId}`);
      modified = true;
    }
    
    // Add resource_id if missing
    if (!hasResourceId) {
      newFields.push('resource_id: null');
      modified = true;
    }
    
    if (newFields.length > 0) {
      // Add new fields at the beginning
      const newFieldsStr = newFields.join(',\n      ');
      fields = `\n      ${newFieldsStr},${fields}`;
    }
    
    return `writeAudit({${fields}}`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      try {
        fixAuditCalls(filePath);
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
      }
    }
  }
}

// Start processing from src directory
walkDirectory('./src');
console.log('Finished fixing all audit calls with missing fields');