const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json());

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { participants: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/participants', (req, res) => {
  const data = readData();
  res.json(data.participants);
});

app.post('/vote', (req, res) => {
  const { participantId } = req.body;
  if (!participantId) return res.status(400).json({ error: 'participantId required' });
  const data = readData();
  const p = data.participants.find(x => x.id === participantId);
  if (!p) return res.status(404).json({ error: 'participant not found' });
  p.votes = (p.votes || 0) + 1;
  writeData(data);
  res.json({ success: true, participant: p });
});

app.post('/comment', (req, res) => {
  const { participantId, text } = req.body;
  if (!participantId || !text) return res.status(400).json({ error: 'participantId and text required' });
  const data = readData();
  const p = data.participants.find(x => x.id === participantId);
  if (!p) return res.status(404).json({ error: 'participant not found' });
  const comment = { text, time: new Date().toLocaleString('fr-FR') };
  p.comments = p.comments || [];
  p.comments.push(comment);
  writeData(data);
  res.json({ success: true, comment });
});

// Endpoint facultatif pour synchroniser l'état complet (utilisé en fallback)
app.post('/sync', (req, res) => {
  const { participants } = req.body;
  if (!Array.isArray(participants)) return res.status(400).json({ error: 'participants array required' });
  writeData({ participants });
  res.json({ success: true });
});

app.get('/classement', (req, res) => {
  const data = readData();
  const sorted = (data.participants || []).slice().sort((a,b) => (b.votes||0) - (a.votes||0));
  res.json({ top: sorted.slice(0, 10), queen: sorted[0] || null });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
