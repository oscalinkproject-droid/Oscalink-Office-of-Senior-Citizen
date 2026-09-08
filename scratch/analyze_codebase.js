const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'c:\\Users\\00lem\\Documents\\OSCALink';
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', '.next', '.expo', 'dist', '.vercel', '.vscode', 'scratch', '__pycache__']);

const patterns = [
  { name: 'console_log', regex: /console\.log\(/, desc: 'console.log remaining in production code' },
  { name: 'todo', regex: /\b(TODO|FIXME)\b/i, desc: 'TODO or FIXME comments' },
  { name: 'hardcoded_secret', regex: /(api[-_]?key|secret|password|token)\s*=\s*['"].+['"]/i, desc: 'Possible hardcoded secret' },
  { name: 'any_type', regex: /:\s*any\b/, desc: "Use of 'any' type in TypeScript" },
  { name: 'missing_error_handling', regex: /\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/, desc: 'Empty catch block' },
  { name: 'eval', regex: /\beval\(/, desc: 'Use of eval() function' },
  { name: 'dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML/, desc: 'Use of dangerouslySetInnerHTML' },
  { name: 'nested_db', regex: /select.*select.*from/i, desc: 'Possible nested SQL or N+1 query pattern' }
];

let totalFiles = 0;
let totalLines = 0;
const fileTypes = {};
const largeFiles = [];
const suspiciousPatterns = [];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.has(file)) {
        walk(fullPath);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.sql', '.py', '.bat'].includes(ext)) {
        totalFiles++;
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        
        const relPath = path.relative(ROOT_DIR, fullPath);
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          totalLines += lines.length;
          
          if (lines.length > 300) {
            largeFiles.push({ path: relPath, lines: lines.length });
          }
          
          if (relPath.includes('package.json') || relPath.includes('package-lock.json')) {
            continue;
          }
          
          lines.forEach((line, index) => {
            const lineNum = index + 1;
            patterns.forEach(pat => {
              if (pat.regex.test(line)) {
                suspiciousPatterns.push({
                  file: relPath,
                  line: lineNum,
                  description: pat.desc,
                  snippet: line.trim().substring(0, 100)
                });
              }
            });
          });
        } catch (e) {
          console.error(`Error reading ${relPath}: ${e.message}`);
        }
      }
    }
  }
}

console.log('Starting scan...');
walk(ROOT_DIR);

console.log('\n=== SUMMARY METRICS ===');
console.log(`Total files scanned: ${totalFiles}`);
console.log(`Total lines of code: ${totalLines}`);

console.log('\n=== FILE TYPES ===');
Object.entries(fileTypes)
  .sort((a, b) => b[1] - a[1])
  .forEach(([ext, count]) => console.log(`  ${ext}: ${count}`));

console.log('\n=== TOP LARGE FILES (Potential performance or maintenance issues) ===');
largeFiles
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 30)
  .forEach(f => console.log(`  ${f.path}: ${f.lines} lines`));

console.log('\n=== SUSPICIOUS PATTERNS FOUND ===');
const patternCounts = {};
suspiciousPatterns.forEach(item => {
  patternCounts[item.description] = (patternCounts[item.description] || 0) + 1;
});
Object.entries(patternCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([desc, count]) => console.log(`  ${desc}: ${count} occurrences`));

console.log('\n=== DETAILS OF CRITICAL PATTERNS (First 50) ===');
suspiciousPatterns.slice(0, 50).forEach(item => {
  console.log(`  [${item.file}:${item.line}] ${item.description}: ${item.snippet}`);
});
