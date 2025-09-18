const express = require("express");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Serve static frontend files from "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Utility function to check a single serial
async function checkSerial(serial) {
  const baseUrl = "https://wbcap2025storage.blob.core.windows.net/public/MeritList_P1/";
  const url = `${baseUrl}${serial}_P1_A1.pdf`;

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    if (response.status === 200) {
      const data = await pdfParse(response.data);
      const lines = data.text.split("\n");

      const collegeLine = lines.find(line => /College|Mahavidyalaya/i.test(line));
      const college = collegeLine ? collegeLine.trim() : "College not found";

      const courseLine = lines.find(line =>
        /[34]\s*-\s*Year/i.test(line) ||
        /B\.(A|Sc|Com|C\.A|B\.B\.M)/i.test(line) ||
        /Bachelor/i.test(line) ||
        /Hons/i.test(line)
      );
      const course = courseLine ? courseLine.trim() : "Course not found";

      return { serial, url, college, course, status: "Found" };
    } else {
      return { serial, url, college: "", course: "", status: `HTTP ${response.status}` };
    }
  } catch (err) {
    return { serial, url, college: "", course: "", status: "Error or Not Found" };
  }
}

// SSE endpoint for streaming results
app.get("/check-sse", async (req, res) => {
  const start = parseInt(req.query.start);
  const end = parseInt(req.query.end);

  if (isNaN(start) || isNaN(end)) {
    res.status(400).send("Invalid start or end");
    return;
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  for (let serial = start; serial <= end; serial++) {
    const result = await checkSerial(serial);
    res.write(`data: ${JSON.stringify(result)}\n\n`);
  }

  // Signal that we are done
  res.write("data: done\n\n");
  res.end();
});

// Optional: POST /check endpoint for backward compatibility
app.post("/check", async (req, res) => {
  const { start, end } = req.body;
  const results = [];

  for (let i = parseInt(start); i <= parseInt(end); i++) {
    results.push(await checkSerial(i));
  }

  res.json(results);
});

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
