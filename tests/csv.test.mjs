import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../js/core/csv.js';

test('CSV: сила лише для типів зі strength, коректне екранування', () => {
  const structure = {
    contentTypes: [{ id: 'h', name: 'H', videosTarget: null, strength: true }, { id: 'f', name: 'F', videosTarget: 12, strength: false }],
    sports: [{ id: 's', name: 'Demo Sport' }],
    categories: [{ id: 's-h', sportId: 's', name: 'Moments' }, { id: 's-f', sportId: 's', name: 'Replays' }],
    tournaments: [
      { id: 't1', categoryId: 's-h', name: 'North League', contentTypeId: 'h', unitType: 'pair' },
      { id: 't2', categoryId: 's-f', name: 'South League', contentTypeId: 'f', unitType: 'pair' },
    ],
  };
  const unit = (note = '') => ({ id: 'u1', a: 'ALPHA', b: 'CHARLIE', status: 'done', priority: null, videos: 12, note, updatedAt: '2026-09-12', history: [] });
  const pool = [{ name: 'ALPHA', strength: 0.41 }, { name: 'CHARLIE', strength: 0.17 }];
  const csv = toCsv(structure, {
    t1: { id: 't1', notes: '', pool, units: [unit('нотатка, з комою')] },
    t2: { id: 't2', notes: '', pool, units: [unit()] },
  });
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const lines = csv.slice(1).trim().split('\r\n');
  assert.equal(lines[0], 'sport,category,tournament,a,strength_a,b,strength_b,status,priority,videos,note,updated_at');
  assert.equal(lines[1], 'Demo Sport,Moments,North League,ALPHA,0.41,CHARLIE,0.17,done,,12,"нотатка, з комою",2026-09-12');
  assert.equal(lines[2], 'Demo Sport,Replays,South League,ALPHA,,CHARLIE,,done,,12,,2026-09-12');
});
