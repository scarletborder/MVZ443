const fs = require('fs');
const glob = require('glob');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}
const all = walk('src');

all.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('PlantsManager') && !content.match(/import\s+.*PlantsManager/)) {
    // how many slashes after src?
    const parts = file.split('/');
    // src/game/presets/plant/chapter1/tnt_mines.ts -> 6 parts. depth = 6 - 2 = 4 -> ../../../../
    // src/game/models/IPlant.ts -> 4 parts. depth = 4 - 2 = 2 -> ../../
    let depth = parts.length - 2;
    // but wait! managers/combat/PlantsManager is inside src/game/
    // so if file is in src/game/presets/... it's ../../managers/combat/PlantsManager
    // wait, if depth from src is simple:
    // parts = [src, game, presets, plant, chapter1, tnt.ts] (6 parts)
    // we want to reach src/game/managers/combat/PlantsManager.
    // The file is in src/game/presets/plant/chapter1
    // to reach src/game: ../../../../
    // then managers/combat/PlantsManager
    // exactly: '../'.repeat(parts.length - 3) + 'managers/combat/PlantsManager'
    let upDir = '../'.repeat(parts.length - 3);
    if (parts.length - 3 === 0) upDir = './'; // if it's in src/game/ already
    
    // exception: what if it's outside src/game? (e.g. src/utils)
    if (parts[1] !== 'game') {
      upDir = '../'.repeat(parts.length - 2) + 'game/managers/combat/PlantsManager';
    } else {
      upDir = upDir + 'managers/combat/PlantsManager';
    }

    content = `import PlantsManager from "${upDir}";\n` + content;
    fs.writeFileSync(file, content, 'utf8');
  }
});
