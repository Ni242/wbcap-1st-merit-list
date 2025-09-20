const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
const pdfParse = require("pdf-parse");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// SSE endpoint (real data)
app.get("/check-sse", async (req, res) => {
  const start = parseInt(req.query.start);
  const end = parseInt(req.query.end);

  if (isNaN(start) || isNaN(end)) return res.status(400).send("Invalid start or end serial");

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const baseUrl = "https://wbcap2025storage.blob.core.windows.net/public/MeritList_P1/";
  let index = start;

  const interval = setInterval(async () => {
    if (index > end) {
      res.write("data: done\n\n");
      clearInterval(interval);
      res.end();
      return;
    }

    const url = `${baseUrl}${index}_P1_A1.pdf`;

    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });

      if (response.status === 200) {
        const data = await pdfParse(response.data);
        const text = data.text;
        const lines = text.split("\n");

        // College
        const collegeLine = lines.find(line => /College|Mahavidyalaya/i.test(line));
        const college = collegeLine ? collegeLine.trim() : "College not found";

        // Course
        const courseLine = lines.find(line =>
          /[34]\s*-\s*Year/i.test(line) ||
          /B\.(A|Sc|Com|C\.A\.|B\.B\.M\.)/i.test(line) ||
          /Bachelor/i.test(line) ||
          /Hons/i.test(line)
        );
        const course = courseLine ? courseLine.trim() : "Course not found";

        const item = {
          serial: index,
          url,
          college,
          course,
          status: "Found",
        };

        res.write(`data: ${JSON.stringify(item)}\n\n`);
      }
    } catch (error) {
      const item = {
        serial: index,
        url,
        college: "",
        course: "",
        status: "Not Found",
      };
      res.write(`data: ${JSON.stringify(item)}\n\n`);
    }

    index++;
  }, 1000); // 1 second per PDF
});

// Default route → serve index.html
// Serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
