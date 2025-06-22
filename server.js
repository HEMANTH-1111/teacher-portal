const express = require('express');
const cors = require('cors');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const USERS = {
  "101": "math123",
  "102": "science456",
  "103": "history789",
  "104": "english321"
};

// LOGIN
app.post('/api/login', (req, res) => {
  const { teacher_id, password } = req.body;
  if (USERS[teacher_id] && USERS[teacher_id] === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid ID or password" });
  }
});

// SCHEDULE
app.get('/api/schedule', (req, res) => {
  const { teacher_id } = req.query;
  const filePath = path.join(__dirname, 'schedule.xlsx');

  if (!fs.existsSync(filePath))
    return res.status(500).json({ error: "Schedule file missing." });

  const wb = xlsx.readFile(filePath);
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const result = data.filter(row => String(row.teacher_id).trim() === teacher_id);

  result.length
    ? res.json(result)
    : res.status(404).json({ error: "No schedule found." });
});

// SUBSTITUTION REQUEST
app.post('/api/substitute', (req, res) => {
  const { from, to, date, reason } = req.body;
  const filePath = path.join(__dirname, 'substitutions.xlsx');

  let requests = [];
  if (fs.existsSync(filePath)) {
    const wb = xlsx.readFile(filePath);
    requests = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  }

  requests.push({ from, to, date, reason, status: "pending" });

  const newWb = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(requests);
  xlsx.utils.book_append_sheet(newWb, sheet, 'Requests');
  xlsx.writeFile(newWb, filePath);

  res.json({ message: `Request sent to Teacher ${to}.` });
});

// VIEW INCOMING REQUESTS
app.get('/api/my-requests', (req, res) => {
  const { teacher_id } = req.query;
  const filePath = path.join(__dirname, 'substitutions.xlsx');

  if (!fs.existsSync(filePath)) return res.json([]);

  const wb = xlsx.readFile(filePath);
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const filtered = data.filter(row => String(row.to) === teacher_id);

  res.json(filtered);
});

// ACCEPT OR DECLINE REQUEST
app.post('/api/respond', (req, res) => {
  const { teacher_id, index, status } = req.body;
  const filePath = path.join(__dirname, 'substitutions.xlsx');

  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "File not found" });

  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  const myRequests = data.filter(r => r.to == teacher_id && (!r.status || r.status === "pending"));

  if (!myRequests[index])
    return res.status(400).json({ error: "Invalid request index" });

  const target = myRequests[index];
  const targetIndex = data.findIndex(r =>
    r.from === target.from && r.to === target.to &&
    r.date === target.date && r.reason === target.reason
  );

  if (targetIndex !== -1) {
    data[targetIndex].status = status;

    const newSheet = xlsx.utils.json_to_sheet(data);
    const newWb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWb, newSheet, 'Requests');
    xlsx.writeFile(newWb, filePath);

    return res.json({ message: `Request ${status}.` });
  }

  res.status(500).json({ error: "Could not update request." });
});
app.get('/api/sent-requests', (req, res) => {
  const { teacher_id } = req.query;
  const filePath = path.join(__dirname, 'substitutions.xlsx');

  if (!fs.existsSync(filePath)) return res.json([]);

  const wb = xlsx.readFile(filePath);
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const result = data.filter(r => String(r.from) === teacher_id);

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});