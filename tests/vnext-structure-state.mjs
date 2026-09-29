import assert from 'node:assert/strict';
import '../editor/vnext-structure-state.js';

const tree = globalThis.EditorVNextStructureState;
const makeScene = () => ({
  entities: [
    { id:'back', type:'shape' },
    { id:'middle', type:'image' },
    { id:'front', type:'shape' }
  ]
});

{
  const scene = makeScene();
  scene.entities[0]=Object.assign(scene.entities[0],{x:10,y:12,w:20,h:10,scaleX:1.5,scaleY:1,rot:15});
  scene.entities[1]=Object.assign(scene.entities[1],{x:42,y:8,w:16,h:24});
  const before=scene.entities.slice(0,2).map(item=>tree.localMatrix(item));
  const group = tree.createGroup(scene, ['back', 'middle']);
  assert.equal(group.type, 'group');
  assert.ok(group.w>1&&group.h>1,'group must own the visible member bounds rather than a 1×1 placeholder');
  assert.equal(scene.entities.find(item => item.id === 'back').parentId, group.id);
  assert.equal(scene.entities.find(item => item.id === 'middle').parentId, group.id);
  assert.equal(scene.entities.filter(item => item.type === 'group').length, 1);
  const grouped=scene.entities.slice().filter(item=>['back','middle'].includes(item.id)).map(item=>tree.multiply(tree.localMatrix(group),tree.localMatrix(item)));
  for(let index=0;index<before.length;index++)for(let cell=0;cell<6;cell++)assert.ok(Math.abs(before[index][cell]-grouped[index][cell])<1e-8,'grouping must preserve the visible local matrix');
  tree.dissolveGroup(scene, group.id);
  assert.equal(scene.entities.find(item => item.id === 'back').parentId, null);
  assert.equal(scene.entities.find(item => item.id === 'middle').parentId, null);
  const dissolved=scene.entities.slice(0,2).map(item=>tree.localMatrix(item));
  for(let index=0;index<before.length;index++)for(let cell=0;cell<6;cell++)assert.ok(Math.abs(before[index][cell]-dissolved[index][cell])<1e-8,'dissolving an identity group must preserve the visible local matrix');
}

{
  const scene = makeScene();
  assert.equal(tree.reorder(scene, 'front', 'back', 'before'), true);
  assert.deepEqual(scene.entities.map(item => item.id), ['front', 'back', 'middle']);
  assert.equal(tree.reorder(scene, 'front', 'middle', 'after'), true);
  assert.deepEqual(scene.entities.map(item => item.id), ['back', 'middle', 'front']);
}

{
  const scene = makeScene();
  const created = tree.reorder(scene, 'front', 'middle', 'inside');
  assert.equal(created.type, 'group', 'drop in the middle of an object creates a group');
  assert.equal(scene.entities.find(item => item.id === 'front').parentId, created.id);
  assert.equal(scene.entities.find(item => item.id === 'middle').parentId, created.id);
  assert.equal(scene.entities.indexOf(created), scene.entities.indexOf(scene.entities.find(item => item.id === 'middle')) - 1);
}

{
  const scene = makeScene();
  const group = tree.createGroup(scene, ['back', 'middle']);
  assert.equal(tree.reorder(scene, 'front', group.id, 'inside'), true);
  assert.equal(scene.entities.find(item => item.id === 'front').parentId, group.id);
  assert.throws(() => tree.reorder(scene, group.id, 'front', 'inside'), /自己的成员/);
}

{
  const scene = makeScene();
  Object.assign(scene.entities[0],{x:10,y:5,w:20,h:12});
  Object.assign(scene.entities[1],{x:45,y:8,w:15,h:14});
  Object.assign(scene.entities[2],{x:82,y:10,w:18,h:16});
  const group = tree.createGroup(scene, ['back', 'middle']);
  const before=tree.worldMatrix(scene,scene.entities.find(item=>item.id==='front'));
  tree.reorder(scene,'front',group.id,'inside');
  const after=tree.worldMatrix(scene,scene.entities.find(item=>item.id==='front'));
  for(let cell=0;cell<6;cell++)assert.ok(Math.abs(before[cell]-after[cell])<1e-8,'reparenting into a group must preserve world position');
  assert.deepEqual(scene.entities.map(item=>item.id),[group.id,'back','middle','front'],'a child moved into a group must remain in the group block');
  assert.throws(() => tree.reorder(scene,group.id,'front','after'),/自己的成员/,'a group cannot be ordered relative to its own descendant');
}

{
  const scene = makeScene();
  Object.assign(scene.entities[0],{x:8,y:5,w:10,h:10});
  Object.assign(scene.entities[1],{x:30,y:6,w:10,h:10});
  const group=tree.createGroup(scene,['back','middle']);
  tree.reorder(scene,group.id,'front','after');
  assert.deepEqual(scene.entities.map(item=>item.id),['front',group.id,'back','middle'],'moving a group must move its full flat z-order block');
}

{
  const scene = makeScene();
  const group = tree.createGroup(scene, ['back', 'middle']);
  scene.timeline={visibility:{[group.id]:{segments:[{f:[0,1],visible:false}]},front:{segments:[{f:[0,1],visible:false}]}},tracks:{[group.id]:{segments:[]},front:{segments:[]}}};
  const result = tree.remove(scene, [group.id]);
  assert.deepEqual(result.dissolved, [group.id]);
  assert.equal(scene.entities.some(item => item.id === 'back'), true, 'delete group dissolves it but preserves members');
  assert.equal(scene.entities.find(item => item.id === 'back').parentId, null);
  assert.equal(scene.timeline.visibility[group.id],undefined,'deleting a group must remove its stale visibility track');
  tree.remove(scene,['front']);assert.equal(scene.timeline.visibility.front,undefined);assert.equal(scene.timeline.tracks.front,undefined,'deleting an object must remove its stale property track');
}

console.log('vnext structure state: ok');
