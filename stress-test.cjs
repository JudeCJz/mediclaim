const http = require('http');

console.log("🧪 Initiating AI-Driven Server Stress Test...");
console.log("Target: http://localhost:5000");

const CONCURRENT_REQUESTS = 100;
const TOTAL_REQUESTS = 500;
let completed = 0;
let errors = 0;
let totalTime = 0;

const startTime = Date.now();

function makeRequest(index) {
  return new Promise((resolve, reject) => {
    const reqStart = Date.now();
    const req = http.get('http://localhost:5000/api/auth/verify', (res) => {
      // It might return 401 Unauthorized, that's completely fine.
      // We are testing the network stack and the Node.js event loop parsing headers.
      res.on('data', () => {}); // consume data
      res.on('end', () => {
        const duration = Date.now() - reqStart;
        resolve(duration);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
    
    // Hard generic timeout
    req.setTimeout(5000, () => {
        req.abort();
        reject(new Error("Timeout limit 5s"));
    });
  });
}

async function runStressTest() {
  const tasks = [];
  
  // We will run batches
  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENT_REQUESTS) {
    const batch = [];
    for(let j = 0; j < CONCURRENT_REQUESTS && (i + j) < TOTAL_REQUESTS; j++) {
       batch.push(makeRequest(i + j).then(t => {
           completed++;
           totalTime += t;
       }).catch(e => {
           errors++;
       }));
    }
    await Promise.all(batch);
    console.log(`Executed ${completed + errors} / ${TOTAL_REQUESTS} requests...`);
  }

  const finalDuration = Date.now() - startTime;
  console.log("\n📊 --- STRESS TEST RESULTS ---");
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);
  console.log(`Concurrent Burst Size: ${CONCURRENT_REQUESTS}`);
  console.log(`Successful API Hits: ${completed}`);
  console.log(`Failed/Timeout Hits: ${errors}`);
  console.log(`Average API Overhead Time: ${completed ? (totalTime / completed).toFixed(2) : 0}ms`);
  console.log(`Total Elapsed Time: ${finalDuration}ms`);
  
  if (errors > 0 || (totalTime/completed) > 2000) {
      console.log("❌ CRITICAL: Backend suffered packet drops or massive latency under load.");
  } else {
      console.log("✅ PASSED: Node.js Express Backend reliably handled heavy concurrency.");
  }
}

runStressTest();
