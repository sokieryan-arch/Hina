import fetch from 'node-fetch';
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);
try {
  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", text: "Hello" }] }),
    signal: controller.signal
  });
  console.log("Status:", response.status);
  const text = await response.text();
  console.log("Body:", text.substring(0, 500));
} catch(e) {
  console.error("Fetch error:", e.message);
} finally {
  clearTimeout(timeoutId);
}
