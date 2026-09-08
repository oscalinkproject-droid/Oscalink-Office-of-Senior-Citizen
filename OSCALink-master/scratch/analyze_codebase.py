import os
import re

ROOT_DIR = r"c:\Users\00lem\Documents\OSCALink"
EXCLUDE_DIRS = {".git", "node_modules", ".next", ".expo", "dist", ".vercel", ".vscode", "scratch", "__pycache__"}

def analyze_codebase():
    total_files = 0
    total_lines = 0
    file_types = {}
    large_files = []
    suspicious_patterns = []
    
    # Suspicious pattern regexes
    patterns = {
        "console_log": (re.compile(r"console\.log\("), "console.log remaining in production code"),
        "todo": (re.compile(r"\b(TODO|FIXME)\b", re.IGNORECASE), "TODO or FIXME comments"),
        "hardcoded_secret": (re.compile(r"(api[-_]?key|secret|password|token)\s*=\s*['\"].+['\"]", re.IGNORECASE), "Possible hardcoded secret"),
        "any_type": (re.compile(r":\s*any\b"), "Use of 'any' type in TypeScript"),
        "missing_error_handling": (re.compile(r"\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)"), "Empty catch block"),
        "eval": (re.compile(r"\beval\("), "Use of eval() function"),
        "dangerouslySetInnerHTML": (re.compile(r"dangerouslySetInnerHTML"), "Use of dangerouslySetInnerHTML"),
        "nested_db": (re.compile(r"select.*select.*from", re.IGNORECASE), "Possible nested SQL or N+1 query pattern"),
    }

    for root, dirs, files in os.walk(ROOT_DIR):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in {".ts", ".tsx", ".js", ".jsx", ".json", ".sql", ".py", ".bat"}:
                total_files += 1
                file_types[ext] = file_types.get(ext, 0) + 1
                
                path = os.path.join(root, file)
                rel_path = os.path.relpath(path, ROOT_DIR)
                
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                        line_count = len(lines)
                        total_lines += line_count
                        
                        if line_count > 300:
                            large_files.append((rel_path, line_count))
                            
                        for line_num, line in enumerate(lines, 1):
                            for name, (regex, desc) in patterns.items():
                                if regex.search(line):
                                    # Filter out false positives in package.json or tests
                                    if "package.json" in rel_path or "package-lock.json" in rel_path or "node_modules" in rel_path:
                                        continue
                                    suspicious_patterns.append({
                                        "file": rel_path,
                                        "line": line_num,
                                        "description": desc,
                                        "snippet": line.strip()[:100]
                                    })
                except Exception as e:
                    print(f"Error reading {rel_path}: {e}")
                    
    print("=== SUMMARY METRICS ===")
    print(f"Total files scanned: {total_files}")
    print(f"Total lines of code: {total_lines}")
    print("\n=== FILE TYPES ===")
    for ext, count in sorted(file_types.items(), key=lambda x: -x[1]):
        print(f"  {ext}: {count}")
        
    print("\n=== TOP LARGE FILES (Potential performance or maintenance issues) ===")
    for path, count in sorted(large_files, key=lambda x: -x[1])[:20]:
        print(f"  {path}: {count} lines")
        
    print("\n=== SUSPICIOUS PATTERNS FOUND ===")
    pattern_counts = {}
    for item in suspicious_patterns:
        pattern_counts[item["description"]] = pattern_counts.get(item["description"], 0) + 1
        
    for desc, count in sorted(pattern_counts.items(), key=lambda x: -x[1]):
        print(f"  {desc}: {count} occurrences")
        
    print("\n=== DETAILS OF CRITICAL PATTERNS (First 30) ===")
    for item in suspicious_patterns[:30]:
        print(f"  [{item['file']}:{item['line']}] {item['description']}: {item['snippet']}")

if __name__ == "__main__":
    analyze_codebase()
