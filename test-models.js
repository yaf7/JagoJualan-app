const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const apiKey = env.match(/GEMINI_API_KEY=(.*)/)[1].trim();

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log("Error:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}
listModels();
