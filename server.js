// server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const pdfParse = require("pdf-parse");

const app = express();

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Use dynamic port for Render or fallback to 3000
const PORT = process.env.PORT || 3000;

// SSE endpoint for streaming results
app.get("/check-sse", async (req, res) => {
  const start = parseInt(req.query.start);
  const end = parseInt(req.query.end);

  // SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const baseUrl = "https://wbcap2025storage.blob.core.windows.net/public/MeritList_P1/";

  for (let i = start; i <= end; i++) {
    const url = `${baseUrl}${i}_P1_A1.pdf`;

    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });

      if (response.status === 200) {
        const data = await pdfParse(response.data);
        const lines = data.text.split("\n");

        const collegeLine = lines.find(line => /College|Mahavidyalaya/i.test(line));
        const college = collegeLine ? collegeLine.trim() : "College not found";

        const courseLine = lines.find(line =>
          /[34]\s*-\s*Year/i.test(line) ||
          /B\.(A|Sc|Com|C\.A\.|B\.B\.M\.)/i.test(line) ||
          /Bachelor/i.test(line) ||
          /Hons/i.test(line)
        );
        const course = courseLine ? courseLine.trim() : "Course not found";

        res.write(`data: ${JSON.stringify({ serial: i, url, college, course, status: "Found" })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ serial: i, url, college: "", course: "", status: `HTTP ${response.status}` })}\n\n`);
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ serial: i, url, college: "", course: "", status: "Error or Not Found" })}\n\n`);
    }
  }

  // Signal that all results are done
  res.write("data: done\n\n");
  res.end();
});

// Optional: simple root route to verify server
app.get("/", (req, res) => {
  res.send("WBCAP 1st Merit List Server is running!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
