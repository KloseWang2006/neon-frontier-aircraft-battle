import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';

export const NEON30_SHOTS = {
  open: {from: 0, duration: 120},
  ready: {from: 120, duration: 135},
  combat: {from: 255, duration: 150},
  power: {from: 405, duration: 105},
  boss: {from: 510, duration: 105},
  leaderboard: {from: 615, duration: 90},
  fighters: {from: 705, duration: 105},
  outro: {from: 810, duration: 90},
} as const;
export const NEON30_TOTAL = 900;

const brand = {ink: '#05061a', panel: '#10133d', cyan: '#58e7ff', pink: '#ff71b5', gold: '#ffc75a', green: '#65ff9a', text: '#eef0ff', muted: '#b6c1ff'};
const enter = (frame: number, delay = 0, stiffness = 115) => spring({frame: Math.max(0, frame - delay), fps: 30, config: {damping: 200, stiffness}});
const fade = (frame: number, duration: number) => interpolate(frame, [0, 10, duration - 12, duration], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const Wordmark: React.FC<{compact?: boolean}> = ({compact = false}) => {
  const frame = useCurrentFrame();
  const p = enter(frame, 6, 120);
  return <div style={{display: 'flex', alignItems: 'center', gap: compact ? 18 : 28, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`}}>
    <div style={{width: compact ? 28 : 48, height: compact ? 28 : 48, border: `3px solid ${brand.cyan}`, transform: 'rotate(45deg)', boxShadow: `0 0 28px ${brand.cyan}`, display: 'grid', placeItems: 'center'}}><div style={{width: compact ? 10 : 17, height: compact ? 10 : 17, background: brand.pink, boxShadow: `0 0 18px ${brand.pink}`}} /></div>
    <div><div style={{fontSize: compact ? 22 : 29, letterSpacing: compact ? 5 : 10, color: brand.muted, fontWeight: 900}}>NEON FRONTIER</div><div style={{fontSize: compact ? 60 : 86, letterSpacing: compact ? 3 : 5, color: brand.text, fontWeight: 900, lineHeight: 1.05}}>霓虹防线 · 飞机大战</div></div>
  </div>;
};

const Caption: React.FC<{text: string; accent?: string; delay: number}> = ({text, accent = brand.cyan, delay}) => {
  const frame = useCurrentFrame(); const p = enter(frame, delay);
  return <div style={{borderLeft: `5px solid ${accent}`, paddingLeft: 20, color: brand.text, fontSize: 60, fontWeight: 900, letterSpacing: 2, opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-42, 0])}px)`, textShadow: `0 0 15px ${accent}`}}>{text}</div>;
};

const Open: React.FC = () => {
  const frame = useCurrentFrame(); const scan = interpolate(frame, [0, 120], [-6, 110], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background: `radial-gradient(circle at 18% 20%,#292568 0%,${brand.ink} 48%)`, overflow: 'hidden', padding: '155px 160px'}}>
    <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#58e7ff0e 1px,transparent 1px),linear-gradient(90deg,#58e7ff0e 1px,transparent 1px)', backgroundSize: '54px 54px'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: `${scan}%`, height: 2, background: brand.cyan, boxShadow: `0 0 30px 8px ${brand.cyan}`, opacity: .65}} />
    <Wordmark />
    <div style={{position: 'absolute', left: 164, bottom: 185, color: brand.muted, fontSize: 30, fontWeight: 800, letterSpacing: 5}}>自动火力 <span style={{color: brand.pink}}>·</span> 四道 Boss 防线 <span style={{color: brand.gold}}>·</span> 本地成绩排行</div>
  </AbsoluteFill>;
};

const RealPage: React.FC<{file: string; scaleFrom: number; scaleTo: number; xFrom: number; xTo: number; children: React.ReactNode}> = ({file, scaleFrom, scaleTo, xFrom, xTo, children}) => {
  const frame = useCurrentFrame(); const p = interpolate(frame, [0, 1, 90, 150], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = interpolate(frame, [0, 150], [scaleFrom, scaleTo], {extrapolateRight: 'clamp'}); const x = interpolate(frame, [0, 150], [xFrom, xTo], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background: brand.ink, opacity: p, overflow: 'hidden'}}>
    <Img src={staticFile(file)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${x}px)`, filter: 'saturate(1.1) contrast(1.06)'}} />
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#05061af0 0%,#05061a8a 46%,transparent 76%)'}} />
    {children}
  </AbsoluteFill>;
};

const Ready: React.FC = () => <RealPage file="game-ready.png" scaleFrom={.88} scaleTo={1.02} xFrom={65} xTo={-18}><div style={{position: 'absolute', left: 130, top: 160, display: 'grid', gap: 26}}><div style={{fontSize: 24, color: brand.muted, fontWeight: 900, letterSpacing: 8}}>PILOT BRIEFING</div><Caption delay={14} text="三架战机，自由预选" /><Caption delay={42} text="基础相同，主动技能不同" accent={brand.pink} /><Caption delay={70} text="Q 键释放蓄能技能" accent={brand.gold} /></div></RealPage>;

const Combat: React.FC = () => <RealPage file="game-running.png" scaleFrom={.9} scaleTo={1.07} xFrom={80} xTo={-52}><div style={{position: 'absolute', left: 130, top: 150, display: 'grid', gap: 29}}><div style={{fontSize: 24, color: brand.muted, fontWeight: 900, letterSpacing: 8}}>LIVE COMBAT</div><Caption delay={16} text="自动射击 · 四向移动" /><Caption delay={46} text="击破敌机，持续积蓄技能" accent={brand.pink} /><Caption delay={76} text="护盾、散射、双倍火力、治疗" accent={brand.gold} /></div></RealPage>;

const Powerups: React.FC = () => {
  const frame = useCurrentFrame(); const items = [{f: 'power-shield.png', t: '护盾', c: brand.cyan}, {f: 'power-spread.png', t: '散射弹', c: '#c39cff'}, {f: 'power-double-fire.png', t: '双倍火力', c: brand.gold}, {f: 'power-heal.png', t: '治疗药水', c: brand.green}];
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 100%,#172b66,${brand.ink} 64%)`, padding: '120px 130px', overflow: 'hidden'}}><div style={{color: brand.muted, fontSize: 24, fontWeight: 900, letterSpacing: 8}}>TACTICAL POWERUPS</div><div style={{color: brand.text, fontSize: 68, fontWeight: 900, marginTop: 14}}>一秒逆转战局</div><div style={{display: 'flex', gap: 28, marginTop: 72}}>{items.map((item, i) => {const p = enter(frame, 10 + i * 12); return <div key={item.t} style={{flex: 1, minHeight: 320, border: `2px solid ${item.c}`, borderRadius: 26, background: `${brand.panel}e9`, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 24, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [76, 0])}px)`, boxShadow: `0 0 30px ${item.c}30`}}><Img src={staticFile(item.f)} style={{width: 138, height: 138, objectFit: 'contain', filter: `drop-shadow(0 0 16px ${item.c})`}} /><div style={{fontSize: 32, color: item.c, fontWeight: 900}}>{item.t}</div></div>;})}</div><div style={{position: 'absolute', bottom: 123, color: brand.muted, fontSize: 34, fontWeight: 800}}>拾取强化包，延长你的推进窗口。</div></AbsoluteFill>;
};

const Boss: React.FC = () => {
  const frame = useCurrentFrame(); const p = enter(frame, 10, 90); const ring = .78 + p * .3;
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 44%,#361257 0%,${brand.ink} 67%)`, overflow: 'hidden', display: 'grid', placeItems: 'center'}}>
    <div style={{position: 'absolute', width: 870, height: 870, border: `2px solid ${brand.pink}`, borderRadius: '50%', opacity: .18, transform: `scale(${ring})`, boxShadow: `0 0 92px ${brand.pink}`}} />
    <Img src={staticFile('boss-ship.png')} style={{width: 500, height: 420, objectFit: 'contain', transform: `scale(${.78 + p * .22})`, filter: 'drop-shadow(0 0 34px #ff4fcd)'}} />
    <div style={{position: 'absolute', left: 130, top: 132, display: 'grid', gap: 25}}><div style={{fontSize: 24, color: brand.muted, fontWeight: 900, letterSpacing: 8}}>BOSS BREAKTHROUGH</div><Caption delay={22} text="10,000 / 30,000 / 50,000 / 100,000" accent={brand.gold} /><Caption delay={52} text="交替弹幕，寻找闪避窗口" accent={brand.pink} /></div>
    <div style={{position: 'absolute', bottom: 108, width: 640, height: 17, background: '#311534', border: `2px solid ${brand.pink}`, borderRadius: 99, overflow: 'hidden'}}><div style={{width: `${interpolate(frame, [10, 84], [8, 100], {extrapolateRight: 'clamp'})}%`, height: '100%', background: `linear-gradient(90deg,${brand.pink},#ff55b1)`, boxShadow: `0 0 18px ${brand.pink}`}} /></div>
  </AbsoluteFill>;
};

const Leaderboard: React.FC = () => {
  const frame = useCurrentFrame(); const p = enter(frame, 8, 105);
  return <AbsoluteFill style={{background: `radial-gradient(circle at 75% 35%,#1c285b,${brand.ink} 62%)`, overflow: 'hidden', padding: '118px 130px'}}>
    <div style={{position: 'absolute', left: 140, top: 164, width: 610, display: 'grid', gap: 26}}><div style={{fontSize: 24, color: brand.muted, fontWeight: 900, letterSpacing: 8}}>LOCAL LEADERBOARD</div><div style={{fontSize: 66, color: brand.text, lineHeight: 1.12, fontWeight: 900}}>成绩，留在你的浏览器</div><div style={{fontSize: 36, color: brand.cyan, fontWeight: 800, lineHeight: 1.45}}>按分数排名；同分再比通关用时。</div></div>
    <div style={{position: 'absolute', right: 118, top: 100, width: 700, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [48, 0])}px) rotate(1deg)`, boxShadow: `0 0 48px #58e7ff33`, borderRadius: 28, overflow: 'hidden'}}><Img src={staticFile('game-leaderboard.png')} style={{width: '100%', display: 'block'}} /></div>
  </AbsoluteFill>;
};

const Fighters: React.FC = () => {
  const frame = useCurrentFrame(); const cards = [{file: 'player-ship.png', name: '蔚蓝风暴', skill: '冲击波 · 范围清场', color: brand.cyan}, {file: 'player-silver-stealth.png', name: '银翼杀手', skill: '隐匿 · 短暂无敌', color: '#e4efff'}, {file: 'player-green-ninja.png', name: '青岚影忍', skill: '援护 · 双僚机支援', color: brand.green}];
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 120%,#172b66,${brand.ink} 64%)`, padding: '112px 120px'}}><div style={{fontSize: 24, color: brand.muted, letterSpacing: 8, fontWeight: 900}}>CHOOSE YOUR FIGHTER</div><div style={{fontSize: 67, color: brand.text, fontWeight: 900, marginTop: 14}}>三架战机，三种战术</div><div style={{display: 'flex', gap: 28, marginTop: 60}}>{cards.map((card, i) => {const p = enter(frame, 10 + i * 12); return <div key={card.name} style={{flex: 1, minHeight: 348, border: `2px solid ${card.color}`, borderRadius: 26, background: `${brand.panel}e9`, padding: 30, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [88, 0])}px)`, boxShadow: `0 0 30px ${card.color}35`}}><Img src={staticFile(card.file)} style={{height: 145, width: '100%', objectFit: 'contain', display: 'block', margin: '0 auto 24px'}}/><div style={{fontSize: 36, color: card.color, fontWeight: 900, textAlign: 'center'}}>{card.name}</div><div style={{fontSize: 34, color: '#c6d1ff', textAlign: 'center', marginTop: 12}}>{card.skill}</div></div>;})}</div></AbsoluteFill>;
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame(); const p = enter(frame, 0, 95);
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 56%,#202367 0%,${brand.ink} 62%)`, overflow: 'hidden', display: 'grid', placeItems: 'center'}}>
    <div style={{position: 'absolute', width: 920, height: 920, border: `2px solid ${brand.cyan}`, borderRadius: '50%', opacity: .14 + p * .2, transform: `scale(${.75 + p * .35})`, boxShadow: `0 0 82px ${brand.cyan}`}} />
    <Img src={staticFile('player-ship.png')} style={{position: 'absolute', width: 165, left: 145, bottom: 130, filter: 'drop-shadow(0 0 20px #58e7ff)'}} /><Img src={staticFile('player-silver-stealth.png')} style={{position: 'absolute', width: 150, right: 145, bottom: 138, filter: 'drop-shadow(0 0 20px #dcecff)'}} /><Img src={staticFile('player-green-ninja.png')} style={{position: 'absolute', width: 154, right: 202, top: 115, filter: 'drop-shadow(0 0 20px #65ff9a)'}} />
    <div style={{transform: `scale(${.82 + p * .18})`, textAlign: 'center'}}><Wordmark compact /><div style={{marginTop: 34, color: brand.cyan, fontSize: 36, letterSpacing: 8, fontWeight: 900, textShadow: `0 0 18px ${brand.cyan}`}}>现在起飞 · 冲破防线</div></div>
  </AbsoluteFill>;
};

const Sfx: React.FC = () => <>
  <Sequence from={NEON30_SHOTS.open.from + 10} durationInFrames={75}><Audio src={staticFile('audio/transition-soft.mp3')} volume={.34} /></Sequence>{/* scan in */}
  <Sequence from={NEON30_SHOTS.ready.from} durationInFrames={82}><Audio src={staticFile('audio/whoosh-big.mp3')} volume={.4} /></Sequence>{/* ready page lands */}
  <Sequence from={NEON30_SHOTS.combat.from} durationInFrames={55}><Audio src={staticFile('audio/swoosh-quick.mp3')} volume={.35} /></Sequence>{/* combat camera push */}
  <Sequence from={NEON30_SHOTS.power.from} durationInFrames={70}><Audio src={staticFile('audio/transition-soft.mp3')} volume={.35} /></Sequence>{/* tactical card reveal */}
  <Sequence from={NEON30_SHOTS.boss.from} durationInFrames={110}><Audio src={staticFile('audio/riser-cine.mp3')} volume={.43} /></Sequence>{/* boss pressure build */}
  <Sequence from={NEON30_SHOTS.boss.from + 28} durationInFrames={90}><Audio src={staticFile('audio/impact-cine.mp3')} volume={.5} /></Sequence>{/* boss lands */}
  <Sequence from={NEON30_SHOTS.leaderboard.from} durationInFrames={70}><Audio src={staticFile('audio/transition-soft.mp3')} volume={.34} /></Sequence>{/* local board reveals */}
  <Sequence from={NEON30_SHOTS.fighters.from} durationInFrames={65}><Audio src={staticFile('audio/whoosh-big.mp3')} volume={.37} /></Sequence>{/* fighter deck opens */}
  <Sequence from={NEON30_SHOTS.outro.from} durationInFrames={90}><Audio src={staticFile('audio/riser-cine.mp3')} volume={.42} /></Sequence>{/* outro launch */}
  <Sequence from={NEON30_SHOTS.outro.from + 26} durationInFrames={90}><Audio src={staticFile('audio/impact-cine.mp3')} volume={.52} /></Sequence>{/* final lockup */}
  <Sequence from={NEON30_SHOTS.outro.from + 54} durationInFrames={80}><Audio src={staticFile('audio/sparkle.mp3')} volume={.28} /></Sequence>{/* final glow */}
</>;

export const Neon30Main: React.FC = () => <AbsoluteFill style={{background: brand.ink}}><Sfx /><Sequence from={NEON30_SHOTS.open.from} durationInFrames={NEON30_SHOTS.open.duration}><Open /></Sequence><Sequence from={NEON30_SHOTS.ready.from} durationInFrames={NEON30_SHOTS.ready.duration}><Ready /></Sequence><Sequence from={NEON30_SHOTS.combat.from} durationInFrames={NEON30_SHOTS.combat.duration}><Combat /></Sequence><Sequence from={NEON30_SHOTS.power.from} durationInFrames={NEON30_SHOTS.power.duration}><Powerups /></Sequence><Sequence from={NEON30_SHOTS.boss.from} durationInFrames={NEON30_SHOTS.boss.duration}><Boss /></Sequence><Sequence from={NEON30_SHOTS.leaderboard.from} durationInFrames={NEON30_SHOTS.leaderboard.duration}><Leaderboard /></Sequence><Sequence from={NEON30_SHOTS.fighters.from} durationInFrames={NEON30_SHOTS.fighters.duration}><Fighters /></Sequence><Sequence from={NEON30_SHOTS.outro.from} durationInFrames={NEON30_SHOTS.outro.duration}><Outro /></Sequence></AbsoluteFill>;
