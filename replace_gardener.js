const fs = require('fs');
const glob = require('glob'); // Need to check if available, or just use fs.readdirSync recursively
// Write a recursive readdir
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace this.game.gardener.planted -> PlantsManager.Instance.planted
  if (content.includes('.gardener.planted')) {
    content = content.replace(/\.gardener\.planted/g, '?.plantsManager?.planted');
    content = content.replace(/scene\?\.plantsManager/g, 'PlantsManager.Instance');
    content = content.replace(/this\.game\.plantsManager\.planted/g, 'PlantsManager.Instance.planted');
    content = content.replace(/game\.plantsManager\.planted/g, 'PlantsManager.Instance.planted');
    content = content.replace(/scene\.plantsManager\.planted/g, 'PlantsManager.Instance.planted');
    changed = true;
  }

  if (content.includes('scene.gardener.planted') || content.includes('scene?.gardener.planted')) {
    content = content.replace(/scene\??\.gardener\.planted/g, 'PlantsManager.Instance.planted');
    changed = true;
  }
  
  if (content.includes('game.gardener.planted')) {
    content = content.replace(/game\.gardener\.planted/g, 'PlantsManager.Instance.planted');
    changed = true;
  }

  // this.gardener.positionCalc
  if (content.includes('.gardener.positionCalc') || content.includes('this.gardener.positionCalc')) {
    content = content.replace(/this\.gardener\.positionCalc/g, 'this.scene.positionCalc');
    content = content.replace(/game\.gardener\.positionCalc/g, 'game.positionCalc');
    content = content.replace(/scene\.gardener\.positionCalc/g, 'scene.positionCalc');
    changed = true;
  }

  // scene.gardener.elastic_putin_nums
  if (content.includes('.gardener.elastic_putin_nums')) {
    content = content.replace(/scene\.gardener\.elastic_putin_nums/g, 'PlantsManager.Instance.elastic_putin_nums');
    changed = true;
  }
  
  // scene.gardener.hasPlantBeforeX
  if (content.includes('.gardener.hasPlantBeforeX')) {
    content = content.replace(/scene\.gardener\.hasPlantBeforeX/g, 'PlantsManager.Instance.hasPlantBeforeX');
    changed = true;
  }

  // scene.gardener.GridClan
  if (content.includes('.gardener.GridClan')) {
    content = content.replace(/scene\.gardener\.GridClan/g, 'PlantsManager.Instance.GridClan');
    changed = true;
  }

  if (changed) {
    if (!content.includes('from') || !content.includes('PlantsManager')) {
        // Need to find relative path. Let's just use absolute-ish or from src.
        // Actually, just append logic to import it correctly...
        // For simplicity, we will fix imports manually if typescript complains.
        // Or we can construct relative depth
    }
    fs.writeFileSync(file, content, 'utf8');
  }
});
console.log('Replacements done');
