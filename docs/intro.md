## 项目概述
这是一个基于 React + TypeScript + Phaser 的游戏项目，名为 "Minecraft Vs Zombie 443"。

## 主要目录结构

```
MVZ443/
├── public/
│   ├── assets/          # 游戏资源
│   ├── locales/         # 国际化文件
│   ├── stages/          # 游戏关卡数据
│   └── constants.ts     # 全局常量
├── src/
│   ├── components/      # React 组件
│   │   ├── menu/       # 菜单相关组件
│   │   ├── shop/       # 商店相关组件
│   │   ├── bottom.tsx  # 底部工具栏
│   │   ├── card.tsx    # 卡片组件
│   │   ├── cardslot.tsx # 卡槽组件
│   │   ├── pickaxe.tsx # 镐子工具
│   │   └── vcard.tsx   # 垂直卡片组件
│   ├── context/        # React Context
│   │   ├── garden_ctx.tsx # 游戏核心上下文
│   │   ├── save_ctx.tsx   # 存档管理
│   │   └── settings_ctx.tsx # 设置管理
│   ├── game/           # 游戏核心逻辑
│   │   ├── models/     # 游戏模型
│   │   ├── presets/    # 预设配置
│   │   ├── scenes/     # 游戏场景
│   │   ├── sprite/     # 精灵动画
│   │   └── utils/      # 工具函数
│   ├── hooks/          # React Hooks
│   ├── utils/          # 通用工具
│   ├── App.tsx         # 应用入口
│   └── main.tsx        # 主入口
├── tools/              # 工具链
│   ├── text_editor/    # 文本编辑器(Go)
│   ├── wave_editor/    # 关卡编辑器(Go)
│   └── server/         # 服务器(Go)
├── .editorconfig       # 编辑器配置
├── log.js             # 日志工具
├── package.json       # 项目配置
├── README.md          # 项目说明
├── tsconfig.json      # TypeScript配置
└── project.md         # 项目进度文档
```

### 源代码目录 (src)
- **components/** - React 组件
  - `menu/` - 菜单相关组件
  - `shop/` - 商店相关组件
  - cardslot.tsx - 卡槽组件
  - bottom.tsx - 底部工具栏组件
  - pickaxe.tsx - 镐子工具组件

- **context/** - React Context 相关
  - garden_ctx.tsx - 游戏核心上下文
  - save_ctx.tsx - 存档管理上下文
  - settings_ctx.tsx - 设置管理上下文

- **game/** - Phaser 游戏相关
  - `scenes/` - 游戏场景
  - `models/` - 游戏模型
  - `utils/` - 工具函数
  - PhaserGame.tsx - 游戏主组件

### 工具目录 (tools)
- `wave_editor/` - 关卡波次编辑器
- `text_editor/` - 文本本地化编辑器
- `server/` - 服务器相关代码

### 配置和资源
- public - 静态资源目录
  - `assets/` - 游戏资源
  - `locales/` - 本地化文件
  - `stages/` - 关卡数据

## 主要技术特性

1. **状态管理**：
- 使用 React Context 进行状态管理
- 包含游戏状态、存档系统和设置管理

2. **国际化支持**：
- 通过 `i18n` 工具支持多语言
- 提供文本编辑器进行本地化管理

3. **游戏功能**：
- 关卡系统
- 商店系统
- 存档系统
- 设置系统

4. **开发工具**：
- 关卡编辑器 (`wave_editor`)
- 本地化编辑器 (`text_editor`)

## 构建和开发命令
```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
```

## 开发模式
项目采用组件化开发，将游戏逻辑与 UI 展示分离，使用 TypeScript 确保类型安全，并提供了完整的工具链支持开发和内容创作。