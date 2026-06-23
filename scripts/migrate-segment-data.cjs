const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const files = ['teyvat.json', 'inazuma.json', 'liyue.json', 'ferry.json', 'same.json'];

const DEFAULTS = {
  regular: [500, 10, 10],
  ferry: [5000, 600, 1000],
  'same-station': [0, 5, 0.5],
};

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  for (const line of data.lines) {
    const defaults = DEFAULTS[line.lineType || 'regular'];
    line.stations = line.stations.map((entry) => {
      if (entry.length >= 5) return entry;
      const [id, dir] = entry;
      return [id, dir, ...defaults];
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`Updated ${file}`);
}

console.log('Done.');
