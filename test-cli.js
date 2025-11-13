import { spawn } from 'child_process';

const cli = spawn('pnpm', ['cli'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

cli.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  output += text;
});

cli.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Wait for prompt, then send message
setTimeout(() => {
  console.log('\n[Sending test message...]\n');
  cli.stdin.write('What are some good hobbies for stress relief?\n');
}, 2000);

// Wait for response, then exit
setTimeout(() => {
  console.log('\n[Exiting...]\n');
  cli.stdin.write('/exit\n');
}, 15000);

cli.on('close', (code) => {
  console.log(`\n[CLI exited with code ${code}]`);
  process.exit(code);
});
