const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\00lem\\.gemini\\antigravity\\brain\\653cfb73-0c56-42c6-9ecd-e907840e44dd\\.system_generated\\logs\\transcript.jsonl';

async function parseLogs() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const step = JSON.parse(line);
      // Search for tool calls of type run_command
      if (step.tool_calls) {
        for (const tc of step.tool_calls) {
          if (tc.name === 'run_command') {
            console.log(`Step ${step.step_index}: run_command -> ${JSON.stringify(tc.args)}`);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

parseLogs();
