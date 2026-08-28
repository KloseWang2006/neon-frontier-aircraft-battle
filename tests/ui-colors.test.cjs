const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const page = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const presentation = fs.readFileSync(
  require('node:path').join(__dirname, '..', 'page-presentation.js'),
  'utf8',
);
const compact = (source) => source.replace(/\s+/g, '');
const compactPage = page;
const compactPresentation = compact(presentation);

test('keeps semantic neon colors for HUD state and powerups', () => {
  for (const selector of [
    '.lives',
    '.state-running',
    '.state-paused',
    '.buff-shield',
    '.buff-spread',
    '.buff-double',
  ]) {
    assert.match(compactPage, new RegExp(selector.replace('.', '\\.') + '[^}]*color:'));
  }
  assert.match(compactPresentation, /className='state-'\+stateName/);
  assert.match(compactPresentation, /className='buffbuff-'\+id/);
  assert.match(compactPage, /\.blink-card-silver\s*\{[^}]*border-color:\s*#b9c8d9/);
  assert.match(compactPage, /\.blink-card-silver\s+\.blink-ready\s*\{[^}]*color:\s*#e9f2ff/);
  assert.match(compactPage, /\.shadow-strike-card\s*\{[^}]*border:\s*1px\s+solid\s+#67e99a/);
});

test('loads the healing sprite and draws its successful-pickup feedback', () => {
  assert.match(compactPresentation, /heal:'power-heal\.png'/);
  assert.match(compactPresentation, /powerup\.kind==='heal'\?'#71ff96':'#fd6'/);
  assert.match(compactPresentation, /state\.healFlashMs>0/);
  assert.match(presentation, /生命 \+1/);
});

test('exposes fighter selection, dynamic skill status, Q activation, and both skill effects', () => {
  for (const selector of ['.skill-meter', '.skill-meter-fill', '.shockwave-ready'])
    assert.match(compactPage, new RegExp(selector.replace('.', '\\.') + '[^}]*'));
  assert.match(compactPage, /<script src="fighter-catalog\.js"><\/script>/);
  assert.match(compactPage, /<script src="page-presentation\.js"><\/script>/);
  assert.match(compactPage, /id="fighterOptions"/);
  assert.match(compactPage, /PagePresentation\.create\(/);
  assert.match(compactPresentation, /functionrenderFighterOptions\(\)/);
  assert.match(compactPresentation, /catalog\.list\(\)/);
  assert.match(compactPresentation, /catalog\.get\(state\.fighterId\)/);
  assert.doesNotMatch(compactPage, /data-fighter="azure"/);
  assert.equal(
    fs.existsSync(
      require('node:path').join(__dirname, '..', 'assets', 'player-silver-stealth.png'),
    ),
    true,
  );
  assert.equal(
    fs.existsSync(require('node:path').join(__dirname, '..', 'assets', 'player-green-ninja.png')),
    true,
  );
  assert.equal(
    fs.existsSync(require('node:path').join(__dirname, '..', 'assets', 'player-yellow-solar.png')),
    true,
  );
  assert.match(compactPage, /id="skillButton"/);
  assert.match(compactPresentation, /skillCharge/);
  assert.match(compactPresentation, /skillCooldownMs/);
  assert.match(compactPage, /event\.key === 'q' \|\| event\.key === 'Q'/);
  assert.match(compactPresentation, /functiondrawShockwave\(state,fighter\)/);
  assert.match(compactPresentation, /state\.shockwaveFlashMs<=0/);
  assert.match(compactPresentation, /functiondrawStealth\(state,fighter\)/);
  assert.match(compactPresentation, /state\.stealthMs<=0/);
  assert.match(compactPage, /--fighter-rotation/);
  assert.match(compactPresentation, /context\.rotate\(\(rotation\*Math\.PI\)\/180\)/);
  assert.match(compactPresentation, /bullet\.color\|\|/);
  assert.match(compactPage, /RunSession\.selectFighter/);
  assert.match(compactPresentation, /fighter\.visual\.effect\.kind!=='wingmen'/);
  assert.match(compactPresentation, /functiondrawWingmen\(state,fighter\)/);
  assert.match(compactPresentation, /functiondrawHoming\(state,fighter\)/);
  assert.match(compactPresentation, /functiondrawShadowStrikes\(state,fighter\)/);
  assert.match(compactPresentation, /shadowStrikeCooldownMs/);
  assert.match(compactPresentation, /bullet\.homing/);
  assert.match(compactPage, /\.homing-active\s*\{\s*color:\s*#ffe85b/);
  assert.doesNotMatch(compactPage, /functiondraw\(/);
});

test('uses a desktop action column for fighter selection, run controls, and movement', () => {
  assert.match(compactPage, /class="side status-side"/);
  assert.match(compactPage, /class="side action-side"/);
  assert.match(compactPage, /\.layout\s*\{\s*grid-template-columns:\s*420px 267px 267px/);
  assert.match(
    compactPage,
    /@media \(max-width: 1050px\)\s*\{\s*\.layout\s*\{\s*grid-template-columns:\s*420px 267px/,
  );
  assert.ok(
    compactPage.indexOf('class="side status-side"') <
      compactPage.indexOf('class="side action-side"'),
  );
  assert.ok(compactPage.indexOf('class="side action-side"') < compactPage.indexOf('移动与射击'));
});

test('stacks the score-registration form and restart action in the end modal', () => {
  assert.match(compactPage, /\.register-form\s*\{\s*display:\s*grid/);
  assert.match(compactPage, /\.modal-secondary\s*\{\s*width:\s*100%/);
  assert.match(presentation, /class="register-form"/);
  assert.match(presentation, /Player ID/);
  assert.ok(presentation.indexOf('id="save"') < presentation.indexOf('id="again"'));
});
