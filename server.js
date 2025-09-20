const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// SSE endpoint
app.get("/check-sse", (req, res) => {
  const start = parseInt(req.query.start);
  const end = parseInt(req.query.end);

  if (isNaN(start) || isNaN(end)) return res.status(400).send("Invalid start or end serial");

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let index = start;
  const interval = setInterval(() => {
    if (index > end) {
      res.write("data: done\n\n");
      clearInterval(interval);
      res.end();
      return;
    }

    const item = {
      serial: index,
      url: `https://example.com/pdf/${index}`,
      college: `College ${index}`,
      course: `Course ${index}`,
      status: index % 2 === 0 ? "Admitted" : "Pending",
    };

    res.write(`data: ${JSON.stringify(item)}\n\n`);
    index++;
  }, 300);
});

// Default route: serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
