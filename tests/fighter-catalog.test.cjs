const assert=require('node:assert/strict');
const test=require('node:test');
const FighterCatalog=require('../fighter-catalog.js');

test('lists the three selectable fighters with complete visual and skill descriptions',()=>{
  const fighters=FighterCatalog.list();
  assert.deepEqual(fighters.map(f=>f.id),['azure','silver','green']);
  for(const fighter of fighters){
    assert.equal(FighterCatalog.get(fighter.id),fighter);
    assert.equal(fighter.speed,320);
    assert.equal(fighter.bulletDamage,1);
    assert.ok(fighter.selection.label);
    assert.ok(fighter.selection.description);
    assert.match(fighter.visual.spriteFile,/^player-.*\.png$/);
    assert.ok(fighter.skillName);
    assert.equal(typeof fighter.rules.activate,'function');
    assert.equal(typeof fighter.rules.tick,'function');
    assert.equal(typeof fighter.rules.afterVolley,'function');
  }
  assert.equal(FighterCatalog.get('missing'),undefined);
});

test('keeps skill visual descriptors separate from the pure ability rules',()=>{
  assert.deepEqual(FighterCatalog.get('azure').visual.effect,{kind:'shockwave',color:'#57eaff'});
  assert.deepEqual(FighterCatalog.get('silver').visual.effect,{kind:'stealth',color:'#d9eeff'});
  assert.deepEqual(FighterCatalog.get('green').visual.effect,{kind:'wingmen',color:'#65ff9a'});
});
