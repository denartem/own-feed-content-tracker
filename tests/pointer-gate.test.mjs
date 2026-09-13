import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPointerGate } from '../js/ui/dom.js';

function setup() {
  const target = new EventTarget();
  const timers = new Map();
  let now = 0;
  let seq = 0;
  const later = (fn, ms) => {
    seq += 1;
    timers.set(seq, { fn, at: now + ms });
    return seq;
  };
  const cancel = (id) => timers.delete(id);
  const advance = (ms) => {
    now += ms;
    for (;;) {
      const due = [...timers].filter(([, t]) => t.at <= now).sort((x, y) => x[1].at - y[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      due[1].fn();
    }
  };
  const gate = createPointerGate(target, { later, cancel });
  const fire = (type) => target.dispatchEvent(new Event(type));
  return { gate, fire, advance };
}

test('без натискання перемальовування відбувається одразу', () => {
  const { gate } = setup();
  let runs = 0;
  gate(() => { runs += 1; });
  assert.equal(runs, 1);
});

test('під час кліку перемальовування чекає події click і виконується один раз', () => {
  const { gate, fire, advance } = setup();
  let runs = 0;
  const render = () => { runs += 1; };
  fire('pointerdown');
  gate(render);
  gate(render);
  fire('pointerup');
  fire('click');
  assert.equal(runs, 0);
  advance(0);
  assert.equal(runs, 1);
});

test('без click (кнопку відпустили деінде) перемальовування виконується за пів секунди', () => {
  const { gate, fire, advance } = setup();
  let runs = 0;
  fire('pointerdown');
  gate(() => { runs += 1; });
  fire('pointerup');
  advance(499);
  assert.equal(runs, 0);
  advance(1);
  assert.equal(runs, 1);
});

test('нове натискання до перемальовування знову відкладає його', () => {
  const { gate, fire, advance } = setup();
  let runs = 0;
  fire('pointerdown');
  gate(() => { runs += 1; });
  fire('pointerup');
  fire('click');
  fire('pointerdown');
  advance(0);
  assert.equal(runs, 0);
  fire('pointerup');
  fire('click');
  advance(0);
  assert.equal(runs, 1);
});
