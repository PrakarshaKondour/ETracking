import fetch from 'node-fetch';

export async function logToLogstash(level, event, data = {}) {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...data
    };

    console.log("📤 Sending to Logstash:", payload);

    const res = await fetch("http://localhost:5044", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log(`📥 Logstash response: ${res.status}`);

  } catch (err) {
    console.error("❌ Logstash error:", err.message);
  }
}
