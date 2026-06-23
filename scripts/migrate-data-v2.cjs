const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const ALL_FILES = ['teyvat.json', 'inazuma.json', 'liyue.json', 'ferry.json', 'same.json'];

const DEFAULTS = {
  regular: 10,
  ferry: 1000,
  'same-station': 0.5,
};

function fileDefaultType(file) {
  if (file === 'ferry.json') return 'ferry';
  if (file === 'same.json') return 'same-station';
  return 'regular';
}

function resolveDistance(values, defaultDist) {
  if (values.length === 0) return defaultDist;
  const nonDefaults = values.filter((v) => v !== defaultDist);
  if (nonDefaults.length === 0) return defaultDist;
  if (nonDefaults.length === 1) return nonDefaults[0];
  return Math.min(...nonDefaults);
}

for (const file of ALL_FILES) {
  const filePath = path.join(DATA_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  const defaultDist = DEFAULTS[fileDefaultType(file)];

  // Step 1: Collect distances from existing station tuples
  const pairDistances = new Map();
  for (const line of data.lines) {
    for (let i = 0; i < line.stations.length - 1; i++) {
      const a = line.stations[i][0];
      const b = line.stations[i + 1][0];
      const dist = line.stations[i][4]; // distance is 5th element (index 4)
      const key = [a, b].sort().join('|');
      if (!pairDistances.has(key)) pairDistances.set(key, []);
      pairDistances.get(key).push(dist);
    }
  }

  // Step 2: Build stationDistances array
  const stationDistances = [];
  for (const [key, values] of pairDistances) {
    const [from, to] = key.split('|');
    const distance = resolveDistance(values, defaultDist);
    stationDistances.push({ from, to, distance });
  }
  stationDistances.sort((a, b) => {
    const ka = [a.from, a.to].sort().join('|');
    const kb = [b.from, b.to].sort().join('|');
    return ka.localeCompare(kb);
  });

  // Step 3: Strip station tuples to [stationId, diagonalFirst]
  for (const line of data.lines) {
    line.stations = line.stations.map((entry) => {
      const [id, dir] = entry;
      return [id, dir];
    });
  }

  // Step 4: Write stationDistances into the file
  data.stationDistances = stationDistances;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`Updated ${file} — ${stationDistances.length} distance entries`);
}

console.log('Migration complete.');
