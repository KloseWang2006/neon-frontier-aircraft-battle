# 霓虹防线 · 飞机大战宣传片

- 8 秒版：`ink-press/out/霓虹防线-飞机大战-8秒宣传片.mp4`
- 30 秒版：`ink-press/out/霓虹防线-飞机大战-30秒宣传片.mp4`
- 规格：两版均为 1920 × 1080、30fps；分别为 240 帧（8 秒）和 900 帧（30 秒）。
- 路线：基于 `video-shotcraft` 的 Ink Press 模板结构重制，保留其“品牌开场 → 真实产品页聚焦 → 功能展示 → 发布式收尾”的节奏，替换为游戏的真实页面、中文文案与霓虹品牌色。

## 画面与文案

| 时段 | 画面 | 文案 |
| --- | --- | --- |
| 0.0–2.5s | 品牌扫描开场 | 霓虹防线 · 飞机大战；无尽火力 · Boss 弹幕 · 本地排行榜 |
| 2.5–5.3s | 真实运行页面 | 自动射击 · 四向闪避；强化拾取 · 技能充能；突破四道 Boss 防线 |
| 5.3–7.0s | 三架战机 | 蔚蓝风暴、银翼杀手、青岚影忍 |
| 7.0–8.0s | Boss 与品牌收尾 | 现在起飞 · 冲破防线 |

## 30 秒版分镜

| 时段 | 画面 | 信息 |
| --- | --- | --- |
| 0.0–4.0s | 品牌扫描开场 | 自动火力、四道 Boss 防线、本地成绩排行 |
| 4.0–8.5s | 真实准备页面 | 三架战机预选与 Q 键技能 |
| 8.5–13.5s | 真实战斗页面 | 自动射击、四向移动、技能充能与强化拾取 |
| 13.5–17.0s | 四种强化包 | 护盾、散射弹、双倍火力、治疗药水 |
| 17.0–20.5s | Boss 段 | 四个分数节点与弹幕闪避窗口 |
| 20.5–23.5s | 真实排行榜 | 浏览器本地保存，按分数与用时排序 |
| 23.5–27.0s | 战机阵容 | 蔚蓝风暴、银翼杀手、青岚影忍 |
| 27.0–30.0s | 品牌收尾 | 现在起飞 · 冲破防线 |

## 素材与渲染

- `素材/game-ready.png`、`素材/game-running.png`：由本项目本地页面采集的真实截图。
- `ink-press/public/`：截图、战机与 Boss 资源。
- `ink-press/src/aifl/Main.tsx`：视频时间线和呈现实现。

在 `ink-press/` 内重新渲染：

```bash
npx remotion render src/index.ts NeonFrontierPromo out/霓虹防线-飞机大战-8秒宣传片.mp4 --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --concurrency 1
```

渲染 30 秒版：

```bash
npx remotion render src/index.ts NeonFrontierPromo30s out/霓虹防线-飞机大战-30秒宣传片.mp4 --browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --concurrency 1
```

## 构建产物约定

- 仓库保留 8 秒与 30 秒两支正式成片，便于直接观看和项目展示。
- `ink-press/out/qa*/` 下的截图是可再生成的质量检查产物，不纳入 Git；渲染或验收时可在本地保留。
- `ink-press/node_modules/` 和 Remotion 缓存仅用于本地构建，不纳入 Git。
