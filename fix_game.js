const fs = require('fs');

let content = fs.readFileSync('src/game/scenes/Game.ts', 'utf8');

// Replace import Gardener
content = content.replace("import Gardener from '../utils/gardener';", 
"import CursorManager from '../managers/combat/CursorManager';\nimport ControlManager from '../managers/combat/ControlManager';\nimport PlantsManager from '../managers/combat/PlantsManager';");

// Replace public gardener: Gardener;
content = content.replace("public gardener: Gardener;", 
"public cursorManager: CursorManager;\n  public controlManager: ControlManager;\n  public plantsManager: PlantsManager;");

// Replace this.gardener = new Gardener(...)
content = content.replace("this.gardener = new Gardener(this, this.positionCalc);", 
"this.controlManager = ControlManager.Instance;\n    this.plantsManager = PlantsManager.Instance;\n    this.plantsManager.gridProperty = this.gridProperty;\n    this.cursorManager = new CursorManager(this);");

// Replace pointer handlers
content = content.replace("this.gardener.onClickUp(pointer);", "this.cursorManager.onClickUp(pointer);");
content = content.replace("this.gardener.onMouseMoveEvent(pointer);", "this.cursorManager.onMouseMoveEvent(pointer);");

// Replace Logic methods
content = content.replace("this.gardener.canPlant(pid, col, row)", "this.plantsManager.canPlant(pid, col, row)");
content = content.replace("this.gardener.removePlant(pid, col, row)", "this.plantsManager.removePlant(pid, col, row)");
content = content.replace("this.gardener.launchStarShards(pid, col, row)", "this.plantsManager.launchStarShards(pid, col, row)");

// Replace control modes
content = content.replace("this.gardener.setPrePlantPid(pid, level)", "this.controlManager.setPrePlantPid(pid, level)");
content = content.replace("this.gardener.cancelPrePlant()", "this.controlManager.cancelPrePlant()");

fs.writeFileSync('src/game/scenes/Game.ts', content, 'utf8');
