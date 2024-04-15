/* globals CanvasRenderingContext2D, HTMLCanvasElement */
/*eslint global-require:off, max-len:off*/
// eslint-disable-next-line import/order
const local_storage = require('glov/client/local_storage');
local_storage.setStoragePrefix('ld55'); // Before requiring anything else that might load from this

import assert from 'assert';
import { autoAtlas } from 'glov/client/autoatlas';
import * as camera2d from 'glov/client/camera2d';
import * as effects from 'glov/client/effects';
import { effectsQueue } from 'glov/client/effects';
import * as engine from 'glov/client/engine';
import {
  ALIGN,
  Font,
  fontStyle,
  fontStyleColored,
  intColorFromVec4Color,
  vec4ColorFromIntColor,
} from 'glov/client/font';
import { framebufferEnd } from 'glov/client/framebuffer';
import { fscreenEnter } from 'glov/client/fscreen';
import {
  KEYS,
  inputClick,
  inputDrag,
  inputTouchMode,
  keyDown,
  keyDownEdge,
  longPress,
  mouseOver,
  mousePos,
} from 'glov/client/input';
import { localStorageGetJSON, localStorageSetJSON } from 'glov/client/local_storage';
import { markdownAuto } from 'glov/client/markdown';
import { markdownImageRegister, markdownSetColorStyle } from 'glov/client/markdown_renderables';
import { netInit } from 'glov/client/net';
import {
  ScoreSystem,
  scoreAlloc,
} from 'glov/client/score';
import { scoresDraw } from 'glov/client/score_ui';
import { FADE, soundPlayMusic, soundResumed } from 'glov/client/sound';
import {
  SPOT_DEFAULT_LABEL,
  spot,
} from 'glov/client/spot';
import {
  BLEND_ADDITIVE,
  Sprite,
  Texture,
  blendModeReset,
  blendModeSet,
  spriteCreate,
  spriteQueueFn,
  spriteQueueRaw4,
} from 'glov/client/sprites';
import {
  TEXTURE_FORMAT,
  textureLoad,
} from 'glov/client/textures';
import {
  LINE_CAP_ROUND,
  UISpriteSet,
  buttonImage,
  buttonText,
  buttonWasFocused,
  drawCircle,
  drawElipse,
  drawLine,
  drawRect,
  panel,
  playUISound,
  scaleSizes,
  setButtonHeight,
  setFontHeight,
  setFontStyles,
  uiBindSounds,
  uiButtonHeight,
  uiButtonWidth,
  uiSetPanelColor,
  uiTextHeight,
} from 'glov/client/ui';
import { randCreate } from 'glov/common/rand_alea';
import { DataObject, TSMap, VoidFunc } from 'glov/common/types';
import { clamp, nop, ridx } from 'glov/common/util';
import {
  Vec2,
  Vec4,
  unit_vec,
  v2dist,
  v2distSq,
  v2same,
  v2set,
  v3iScale,
  v4same,
  vec2,
  vec4,
} from 'glov/common/vmath';
import { randomDemonName } from './demon_names';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { PI, abs, atan2, cos, floor, max, min, round, sin, sqrt } = Math;

const SCREENSHOT_MODE = false;

window.Z = window.Z || {};
Z.BACKGROUND = 1;
Z.SPRITES = 10;
Z.CIRCLES = 10;
Z.LINES = 9;
Z.POWER = 11;
Z.POSTPROCESS = 15;
Z.DEMON = 50;
Z.POSTPROCESS_LATE = Z.DEMON + 4.5;
Z.HOVER = 60;
Z.UI = 100;
Z.GRAPH_OVERLAY = 100;
Z.RUNES = 100; // Z.POWER;

Z.OVERLAY = 200;

// Virtual viewport for our game logic
const game_width = 1920;
const game_height = 1080;

const palette = [
  vec4(1, 1, 1, 1),
  vec4(0, 1, 0.2, 1),
  vec4(0, 0, 0, 1),
  vec4(1, 0.25, 0.5, 1),
  vec4(0, 0, 1, 1),
  vec4(196/255, 17/255, 255/255, 1),
  v3iScale(vec4(196/255, 17/255, 255/255, 1), 0.35) as Vec4,
  vec4ColorFromIntColor(vec4(), 0x1b0326ff),
  vec4ColorFromIntColor(vec4(), 0x7a1c4bff),
  vec4ColorFromIntColor(vec4(), 0x45ba7fff),
  vec4ColorFromIntColor(vec4(), 0xba5044ff),
  vec4ColorFromIntColor(vec4(), 0xd7c4b3ff),
  vec4ColorFromIntColor(vec4(), 0xddbfa2ff),
  vec4(0.25, 1.0, 0.5, 1), // 13
  vec4(0.5, 0, 0, 1),
  vec4(0.5, 1, 1, 1),
  vec4(1, 0, 0, 1),
  vec4(1, 0.6, 0.5, 1),
];
const PALETTE_CIRCLE = 15;
// const PALETTE_LINE = 0;
const PALETTE_BG = 2;
const PALETTE_HOVER = 4;
const PALETTE_HOVER_DELETE = 14;
const PALETTE_GLOW = 5;
// const PALETTE_GLOW_SUBDUED = 6;
const PALETTE_POWER = PALETTE_GLOW;
const PALETTE_SYMERROR_HIGHLIGHT = 3;
const PALETTE_SYMERROR_NORMAL = 17;
const PALETTE_SYMMATCH = 13;
const PALETTE_CRIM_KNOWLEDGE_BAR = 9;
const PALETTE_OFFWHITE = 12;
const PALETTE_TARGET_GLOW = 16;

const style_eval = fontStyle(null, {
  color: 0xFFFFFFff,
  glow_color: intColorFromVec4Color(palette[PALETTE_GLOW]),
  glow_inner: 0,
  glow_outer: 2.5,
});
const style_eval_match = fontStyle(style_eval, {
  glow_color: intColorFromVec4Color(palette[PALETTE_CRIM_KNOWLEDGE_BAR]),
});
const style_eval_target2 = fontStyle(style_eval, {
  color: intColorFromVec4Color(palette[PALETTE_OFFWHITE]),
  glow_color: 0xFF0000ff,
});
const style_eval2 = fontStyle(null, {
  color: intColorFromVec4Color(palette[PALETTE_OFFWHITE]),
  glow_color: intColorFromVec4Color(palette[PALETTE_GLOW]),
  glow_inner: -2.5,
  glow_outer: 7,
});
const style_help = style_eval;
const style_help_highlight = fontStyle(style_eval, {
  color: 0xFFFF80ff,
});
const style_help_term = fontStyle(style_eval, {
  color: 0x80FFFFff,
});

const MC_W = 840;
const MC_X0 = (game_width - MC_W) / 2;
const MC_Y0 = 60;
const MC_R = MC_W / 2;
const MC_XC = MC_X0 + MC_W/2;
const MC_YC = MC_Y0 + MC_W/2;
const LINE_W = 8;
const LINE_W_DELETE = 4;
const POWER_R = 40;

const VIS_MAXR = MC_R + POWER_R + LINE_W/2;
const AREA_CANVAS_W = 512;
const VIS_TO_CANVAS_SCALE = 1 / VIS_MAXR * AREA_CANVAS_W / 2;

const CIRCLE_STEPS = 12;
const ANGLE_STEPS = 48;
const CIRCLE_MIN = 4;

type JSVec4 = [number, number, number, number];

function canonicalLine(line: JSVec4): void {
  if (line[1] < 0) {
    line[1] += ANGLE_STEPS;
  }
  if (line[3] < 0) {
    line[3] += ANGLE_STEPS;
  }
  if (line[0] > line[2]) {
    let t = line[0];
    line[0] = line[2];
    line[2] = t;
    t = line[1];
    line[1] = line[3];
    line[3] = t;
  } else if (line[0] === line[2] && line[1] > line[3]) {
    let t = line[1];
    line[1] = line[3];
    line[3] = t;
  }
}

function mirror(a: number): number {
  return (ANGLE_STEPS - a) % ANGLE_STEPS;
}

const area_buf = new Uint8Array(AREA_CANVAS_W * AREA_CANVAS_W);
const power_buf = new Uint8Array(AREA_CANVAS_W * AREA_CANVAS_W);
const power_buf2 = new Uint8Array(AREA_CANVAS_W * AREA_CANVAS_W);
const power_todo = new Uint32Array(AREA_CANVAS_W * AREA_CANVAS_W);

let rand = randCreate(1);

type EvalType = 'components' | 'symmetry' | 'cells' | 'power';
type Evaluation = Record<EvalType, number>;
type DemonTarget = {
  // gen-time
  color: Vec4;
  name: string;
  seed: number;
} & Record<EvalType, number>;
let ranges: Record<EvalType, [number, number]> = {
  components: [3, 40],
  cells: [2, 50],
  symmetry: [0, 100],
  power: [5, 100],
};
function randFromRange(range: [number, number], normalize: number): number {
  if (normalize <= 1) {
    return range[0] + rand.range(range[1] - range[0] + 1);
  }
  let ret = 0;
  for (let ii = 0; ii < normalize; ii++) {
    ret += randFromRange(range, 0);
  }

  return round(ret / normalize);
}
function randomDemonTarget(existing: DemonTarget[]): DemonTarget {

  let components = randFromRange(ranges.components, 2);
  randFromRange([1,50], 0); // was: ink
  let cells = randFromRange(ranges.cells, 0);
  let symmetry = randFromRange(ranges.symmetry, 0);
  let power = randFromRange(ranges.power, 0);

  let seed = rand.range(10000);

  let name;
  while (true) {
    name = randomDemonName(rand);
    let found = false;
    for (let ii = 0; ii < existing.length; ++ii) {
      if (existing[ii].color === name[1] && ii > existing.length - 3) {
        found = true;
      } else if (existing[ii].name.endsWith(name[0].split(' ')[1])) {
        found = true;
      }
    }
    if (!found) {
      break;
    }
  }

  return {
    name: name[0],
    color: name[1],
    components,
    cells,
    symmetry,
    power,
    seed,
  };
}

export type Score = {
  match: number;
};
let score_system: ScoreSystem<Score>;

const MATCH_PERFECT = 0.05;

const EVALS: [EvalType, string, number, number][] = [
  ['components', 'Components', 0, -1],
  ['power', 'Power', 1, 0],
  ['cells', 'Cells', 0, 1],
  ['symmetry', 'Symmetry', -1, 0],
];

function evalMatch(evaluation: Evaluation, demon: DemonTarget): number {
  let match_sum = 0;
  let num_evals = EVALS.length;
  for (let ii = 0; ii < num_evals; ++ii) {
    let eval_type = EVALS[ii][0];
    let range = ranges[eval_type];
    let my_v = clamp((evaluation[eval_type] - range[0]) / (range[1] - range[0]), 0, 1);
    let desired_v = (demon[eval_type] - range[0]) / (range[1] - range[0]);
    let match = abs(my_v - desired_v); // 0...1
    if (match < MATCH_PERFECT) {
      match = 1000;
    } else {
      match = (match - MATCH_PERFECT) / (1 - MATCH_PERFECT); // 0...1 again
      match = max(0, 1 - match * 2);
      match = clamp(round(match * match * 1000), 0, 999);
    }
    match_sum += match;
  }
  let ret = round(match_sum / num_evals);
  if (match_sum !== num_evals * 1000) {
    ret = min(ret, 999);
  }
  return ret;
}

rand.reseed(1235);
let fixed_targets: DemonTarget[] = [];
for (let ii = 0; ii < 10; ++ii) {
  fixed_targets.push(randomDemonTarget(fixed_targets));
}
fixed_targets[0].components = 14;
fixed_targets[0].cells = 25;
fixed_targets[0].symmetry = 0;
fixed_targets[0].power = 25;
fixed_targets[1].components = 14;
fixed_targets[1].cells = 15;
fixed_targets[1].symmetry = 75;
fixed_targets[1].power = 85;
fixed_targets[2].power = 95;
fixed_targets[3].components = 18;

class GameState {
  circles: number[] = [8];
  lines: JSVec4[] = [[0, 5, 0, 20]];
  power: [number, number][] = [[0, 15]];
  placing: null | [number, number] = null;
  symmap!: {
    lines: boolean[];
    power: boolean[];
    symcount: number;
    symmax: number;
  };
  target: DemonTarget;
  best_score: number = 0;
  cur_score: number = 0;
  did_anything = false;
  undo_stack: string[] = [];
  undo_idx: number = 0; // where we will write
  constructor(public level_idx: number) {
    rand.reseed(level_idx * 1007);
    let saved = localStorageGetJSON<DataObject>(`save.${level_idx}`);
    if (saved) {
      this.fromJSON(saved);
    }

    this.target = fixed_targets[level_idx] || randomDemonTarget([]);

    this.evaluate();
    this.undo_stack[this.undo_idx++] = JSON.stringify(this.toJSON());
  }
  commit(): void {
    this.did_anything = true;
    this.evaluate();
    let ser = this.toJSON();
    localStorageSetJSON(`save.${this.level_idx}`, ser);
    let ser_string = JSON.stringify(ser);
    if (this.undo_stack[this.undo_idx-1] !== ser_string) {
      this.undo_stack[this.undo_idx++] = ser_string;
      this.undo_stack.length = this.undo_idx;
    }
  }
  canUndo(): boolean {
    return this.undo_idx >= 2;
  }
  canRedo(): boolean {
    return this.undo_idx < this.undo_stack.length;
  }
  undo(): void {
    --this.undo_idx;
    this.fromJSON(JSON.parse(this.undo_stack[this.undo_idx - 1]));
    this.commit();
  }
  redo(): void {
    ++this.undo_idx;
    this.fromJSON(JSON.parse(this.undo_stack[this.undo_idx - 1]));
    this.commit();
  }
  fromJSON(saved: DataObject): void {
    this.circles = saved.circles as number[];
    this.lines = saved.lines as JSVec4[];
    this.power = saved.power as [number, number][];
    this.best_score = saved.best_score as number || 0;
    // fixup bad debug data
    for (let ii = 0; ii < this.lines.length; ++ii) {
      canonicalLine(this.lines[ii]);
    }
    for (let ii = 0; ii < this.power.length; ++ii) {
      this.power[ii][1] = (this.power[ii][1] + ANGLE_STEPS) % ANGLE_STEPS;
    }
  }
  toJSON(): DataObject {
    return {
      best_score: this.best_score,
      circles: this.circles,
      lines: this.lines,
      power: this.power,
    };
  }

  area_canvas: HTMLCanvasElement | null = null;
  area_ctx: CanvasRenderingContext2D | null = null;
  area_tex_dirty = false;
  power_tex_dirty = false;
  area_tex: Texture | null = null;
  power_tex: Texture | null = null;
  area_sprite: Sprite | null = null;
  power_sprite: Sprite | null = null;
  evaluateAreas(): [number, number] {
    let canvas = this.area_canvas;
    const w = AREA_CANVAS_W;
    const center = w / 2;
    const CANVAS_R = VIS_TO_CANVAS_SCALE * MC_R;
    if (!canvas) {
      canvas = this.area_canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = w;
      this.area_ctx = canvas.getContext('2d', { willReadFrequently: true });
    }
    let ctx = this.area_ctx;
    assert(ctx);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = VIS_TO_CANVAS_SCALE * LINE_W / 2;

    let { circles, lines, power } = this;
    for (let ii = 0; ii < circles.length; ++ii) {
      let r = circles[ii];
      ctx.beginPath();
      ctx.arc(center, center, CANVAS_R * r / CIRCLE_STEPS, 0, 2 * PI);
      ctx.stroke();
    }

    function circAngleToXY2(circ: number, ang: number): [number, number] {
      let r = circles[circ] / CIRCLE_STEPS;
      ang = ang / ANGLE_STEPS * 2 * PI;
      return [
        center + sin(ang) * r * CANVAS_R,
        center + cos(ang) * r * CANVAS_R,
      ];
    }

    for (let ii = 0; ii < lines.length; ++ii) {
      let line = lines[ii];
      let [x0, y0] = circAngleToXY2(line[0], line[1]);
      let [x1, y1] = circAngleToXY2(line[2], line[3]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    ctx.fillStyle = '#ff0';
    for (let ii = 0; ii < power.length; ++ii) {
      let pow = power[ii];
      let [x, y] = circAngleToXY2(pow[0], pow[1]);
      ctx.beginPath();
      ctx.arc(x, y, POWER_R * VIS_TO_CANVAS_SCALE, 0, PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    let img_data = ctx.getImageData(0, 0, w, w).data;
    let power_todo_len = 0;
    for (let yy = 0, outi=0, ini=0; yy < w; ++yy) {
      for (let xx = 0; xx < w; ++xx, ++outi, ini+=4) {
        let v = img_data[ini] > 127 ? 255 : 0;
        if (!xx || !yy || xx === w - 1 || yy === w - 1) {
          v = 255;
        }
        area_buf[outi] = v;

        let is_any = img_data[ini] > 0;
        let is_power = v && img_data[ini + 2] < 127;
        power_buf[outi] = is_power ? 255 : is_any ? 1 : 0;
        if (is_power) {
          power_todo[power_todo_len++] = outi;
        }
      }
    }

    // count areas
    function fill(x: number, y: number, oldv: number, v: number): number {
      let count = 0;
      let todo: number[] = [];
      function queue(idx: number): void {
        if (area_buf[idx] === oldv) {
          ++count;
          area_buf[idx] = v;
          todo.push(idx);
        }
      }
      queue(x + y * w);
      while (todo.length) {
        let idx = todo.pop()!;
        queue(idx - 1);
        queue(idx + 1);
        queue(idx - w);
        queue(idx + w);
      }
      return count;
    }
    // fill outside
    fill(1,1, 0, 16);
    fill(1,w-2, 0, 16);
    fill(w-2,w-2, 0, 16);
    fill(w-2,1, 0, 16);
    let ret = 0;
    for (let yy = 0, idx=0; yy < w; ++yy) {
      for (let xx = 0; xx < w; ++xx, ++idx) {
        if (!area_buf[idx]) {
          let v = 32 + ((ret * 77) % (256 - 64));
          let count = fill(xx, yy, 0, v);
          if (count > 3) {
            ++ret;
          } else {
            fill(xx, yy, v, 255);
          }
        }
      }
    }

    let power_todo_walk = 0;
    while (power_todo_walk < power_todo_len) {
      let next = power_todo[power_todo_walk++];
      let v = power_buf[next] - 2;
      if (v <= 1) {
        continue;
      }
      if (power_buf[next - 1] && power_buf[next - 1] < v) {
        power_buf[next - 1] = v;
        power_todo[power_todo_len++] = next - 1;
      }
      if (power_buf[next + 1] && power_buf[next + 1] < v) {
        power_buf[next + 1] = v;
        power_todo[power_todo_len++] = next + 1;
      }
      if (power_buf[next + w] && power_buf[next + w] < v) {
        power_buf[next + w] = v;
        power_todo[power_todo_len++] = next + w;
      }
      if (power_buf[next - w] && power_buf[next - w] < v) {
        power_buf[next - w] = v;
        power_todo[power_todo_len++] = next - w;
      }
    }
    // calc totals, and adjust image for rendering
    let powered = 0;
    let unpowered = 0;
    for (let yy = 0, idx=0; yy < w; ++yy) {
      for (let xx = 0; xx < w; ++xx, ++idx) {
        let v = power_buf[idx];
        if (!xx || !yy || xx === w - 1 || yy === w - 1) {
          power_buf[idx] = 0;
          v = 0;
        }
        if (v) {
          if (v === 1) {
            unpowered++;
          } else if (v !== 255) {
            powered++;
          }
        }
      }
    }

    // expand for rendering
    const N = [0, -1, 1, -w, w];
    function expand(from: Uint8Array, to: Uint8Array): void {
      for (let idx = 0; idx < w * w; ++idx) {
        let v = 0;
        for (let ii = 0; ii < N.length; ++ii) {
          let idx2 = idx + N[ii];
          if (idx2 >= 0 && idx2 < w * w) {
            v = max(v, from[idx2]);
          }
        }
        to[idx] = v;
      }
    }
    expand(power_buf, power_buf2);
    expand(power_buf2, power_buf);

    this.area_tex_dirty = true;
    this.power_tex_dirty = true;

    return [ret, powered ? powered/(powered + unpowered) * 100 : 0];
  }

  getCellSprite(): Sprite | null {
    if (this.area_tex_dirty) {
      this.area_tex_dirty = false;

      const w = AREA_CANVAS_W;
      if (!this.area_tex) {
        this.area_tex = textureLoad({
          width: w,
          height: w,
          format: TEXTURE_FORMAT.R8,
          name: 'area_eval',
          data: area_buf,
          filter_min: gl.NEAREST,
          filter_mag: gl.NEAREST,
        });
      }
      // @ts-expect-error TODO!
      this.area_tex.updateData(w, w, area_buf);

      if (!this.area_sprite) {
        this.area_sprite = spriteCreate({
          texs: [this.area_tex!],
        });
      }

    }
    return this.area_sprite;
  }

  getPowerSprite(): Sprite | null {
    if (this.power_tex_dirty) {
      this.power_tex_dirty = false;

      const w = AREA_CANVAS_W;
      if (!this.power_tex) {
        this.power_tex = textureLoad({
          width: w,
          height: w,
          format: TEXTURE_FORMAT.R8,
          name: 'power_eval',
          data: power_buf,
          wrap_s: gl.CLAMP_TO_EDGE,
          wrap_t: gl.CLAMP_TO_EDGE,
          filter_min: gl.LINEAR,
          filter_mag: gl.LINEAR,
        });
      }
      // @ts-expect-error TODO!
      this.power_tex.updateData(w, w, power_buf);

      if (!this.power_sprite) {
        this.power_sprite = spriteCreate({
          texs: [this.power_tex!],
        });
      }
    }
    return this.power_sprite;
  }

  evaluation!: Evaluation;
  evaluate(): void {
    let components = 0;
    let { circles, lines, power } = this;
    this.symmap = {
      lines: [],
      power: [],
      symmax: 0,
      symcount: 0,
    };
    let symmap = this.symmap;
    let symmetry = 0;
    let symmax = 0;
    components += circles.length;
    let all_lines: TSMap<true> = {};
    for (let ii = 0; ii < lines.length; ++ii) {
      all_lines[lines[ii].join(',')] = true;
    }
    for (let ii = 0; ii < lines.length; ++ii) {
      let [c0, a0, c1, a1] = lines[ii];
      ++components;

      // check for symmetry
      let is_sym = false;
      // radial symmetry
      for (let offs = 1; offs <= ANGLE_STEPS / 2; ++offs) {
        let test1 = [c0, (a0 + offs) % ANGLE_STEPS, c1, (a1 + offs) % ANGLE_STEPS];
        if (c0 === c1 && test1[1] > test1[3]) {
          let t = test1[1];
          test1[1] = test1[3];
          test1[3] = t;
        }
        if (!all_lines[test1.join(',')]) {
          continue;
        }
        test1[1] = (a0 - offs + ANGLE_STEPS) % ANGLE_STEPS;
        test1[3] = (a1 - offs + ANGLE_STEPS) % ANGLE_STEPS;
        if (c0 === c1 && test1[1] > test1[3]) {
          let t = test1[1];
          test1[1] = test1[3];
          test1[3] = t;
        }
        if (!all_lines[test1.join(',')]) {
          continue;
        }
        is_sym = true;
        break;
      }
      if (!is_sym) {
        // horizontal symmetry
        let test1: JSVec4 = [c0, mirror(a0), c1, mirror(a1)];
        canonicalLine(test1);
        if (all_lines[test1.join(',')]) {
          is_sym = true;
        }
      }
      ++symmax;
      if (is_sym) {
        ++symmetry;
      }
      symmap.lines.push(is_sym);
    }
    let all_power: TSMap<true> = {};
    for (let ii = 0; ii < power.length; ++ii) {
      all_power[power[ii].join(',')] = true;
    }
    for (let ii = 0; ii < power.length; ++ii) {
      ++components;

      // check for symmetry
      let [c0, a0] = power[ii];
      let is_sym = false;
      // radial symmetry
      for (let offs = 1; offs <= ANGLE_STEPS / 2; ++offs) {
        let test1 = [c0, (a0 + offs) % ANGLE_STEPS];
        if (!all_power[test1.join(',')]) {
          continue;
        }
        test1[1] = (a0 - offs + ANGLE_STEPS) % ANGLE_STEPS;
        if (!all_power[test1.join(',')]) {
          continue;
        }
        is_sym = true;
        break;
      }
      if (!is_sym && a0 !== mirror(a0)) {
        // horizontal symmetry
        let test1 = [c0, mirror(a0)];
        if (all_power[test1.join(',')]) {
          is_sym = true;
        }
      }
      ++symmax;
      if (is_sym) {
        ++symmetry;
      }
      symmap.power.push(is_sym);
    }
    symmap.symcount = symmetry;
    symmap.symmax = symmax;

    let [cells, power_eval] = this.evaluateAreas();

    this.evaluation = {
      components,
      cells,
      power: power_eval,
      symmetry: (symmax ? symmetry / symmax : 1) * 100,
    };

    this.cur_score = evalMatch(this.evaluation, this.target);
    if (this.cur_score > this.best_score) {
      this.best_score = this.cur_score;
      let score: Score = {
        match: this.best_score,
      };
      score_system.setScore(this.level_idx, score);
    }
  }
}

let font: Font;

let game_state: GameState;
let sprite_runes: Sprite;
let sprite_graph: Sprite;
let sprite_demonrect: Sprite;
let sprite_radarrect: Sprite;
let sprite_gradient: Sprite;
let level_idx = 0;
const MAX_LEVEL = 1000;
let game_state_cache: GameState[] = [];
function getGameState(): void {
  game_state = game_state_cache[level_idx];
  if (!game_state) {
    game_state = game_state_cache[level_idx] = new GameState(level_idx);
  }
  game_state.evaluate();
}
function init(): void {
  score_system = scoreAlloc({
    score_to_value: (score: Score): number => score.match,
    value_to_score: (value: number): Score => ({ match: value }),
    level_defs: MAX_LEVEL,
    score_key: 'LD55a',
    ls_key: 'ld55a',
    asc: false,
    rel: 8,
    num_names: 3,
    histogram: false,
  });
  getGameState();
  sprite_runes = autoAtlas('runes', 'def');
  sprite_graph = spriteCreate({
    name: 'graph',
    filter_min: gl.LINEAR_MIPMAP_LINEAR,
    filter_mag: gl.LINEAR,
  });
  sprite_demonrect = spriteCreate({
    name: 'demonrect',
    filter_min: gl.LINEAR_MIPMAP_LINEAR,
    filter_mag: gl.LINEAR,
  });
  sprite_radarrect = spriteCreate({
    name: 'radarrect',
    filter_min: gl.LINEAR_MIPMAP_LINEAR,
    filter_mag: gl.LINEAR,
  });
  sprite_gradient = spriteCreate({
    name: 'gradient',
    filter_min: gl.LINEAR,
    filter_mag: gl.LINEAR,
    wrap_s: gl.REPEAT,
    wrap_t: gl.CLAMP_TO_EDGE,
  });
  markdownImageRegister('spacer', {
    sprite: autoAtlas('misc', 'spacer'),
    frame: 0,
  });
  markdownImageRegister('help', {
    sprite: autoAtlas('misc', 'help_hover'),
    frame: 0,
  });
  markdownSetColorStyle(0, style_help_highlight);
  markdownSetColorStyle(1, style_help_term);
}

function circAngleToXY(circ: number, ang: number): [number, number] {
  let r = game_state.circles[circ] / CIRCLE_STEPS;
  ang = ang / ANGLE_STEPS * 2 * PI;
  return [
    MC_XC + sin(ang) * r * MC_R,
    MC_YC + cos(ang) * r * MC_R,
  ];
}

function drawCircleAA(x: number, y: number, z: number, r: number, line_w: number, precise: number, color: Vec4): void {
  let segments = max(50, round(r / 2));
  let dr = PI * 2 / segments;
  let angle = 0;
  let xx = x + sin(angle) * r;
  let yy = y + cos(angle) * r;
  for (let ii = 0; ii < segments; ++ii) {
    angle += dr;
    let x2 = x + sin(angle) * r;
    let y2 = y + cos(angle) * r;
    drawLine(xx, yy, x2, y2, z, line_w, precise, color, LINE_CAP_ROUND);
    xx = x2;
    yy = y2;
  }
}

function angleDiff(a: number, b: number): number {
  let d = abs(a - b);
  if (d > ANGLE_STEPS / 2) {
    d = ANGLE_STEPS - d;
  }
  return d;
}

let this_frame_source: unknown;
function doBlurEffect(factor: number): void {
  let params = {
    blur: factor,
    glow: 1,
    max_size: 1024,
    min_size: 256,
    framebuffer_source: null as unknown,
  };
  effects.applyGaussianBlur(params);
  this_frame_source = params.framebuffer_source;
}

let tex2_transform = vec4(1, 1, 0, 0);
let this_frame_glow_buf: Texture;
function doColorEffectEarly(highlight_symmetry: boolean): void {
  this_frame_glow_buf = framebufferEnd({ filter_linear: false, need_depth: false });
  effects.applyCopy({
    source: sprite_gradient.texs[0],
    shader: 'clear',
    params: {
      color: game_state.target.color,
    },
  });
}
let pulse_color = palette[PALETTE_POWER];
let pulse_param = vec4(pulse_color[0], pulse_color[1], pulse_color[2], 0);
function doColorEffectLate(highlight_power: boolean, highlight_symmetry: boolean): void {
  let v = (1 - ((engine.getFrameTimestamp() * 0.0002) % 1)) * 2.0 - 0.8;
  if (v > 1) {
    v = 1 + (v - 1) * 0.4;
  }
  pulse_param[3] = v;
  let params = {
    color: palette[PALETTE_GLOW],
    tex2_transform,
    pulse: pulse_param,
  };
  let source = [
    this_frame_source,
    this_frame_glow_buf,
    game_state.getPowerSprite()!.texs[0],
  ];
  blendModeSet(BLEND_ADDITIVE);
  effects.applyCopy({
    shader: highlight_power ? 'glow_merge_power' : highlight_symmetry ? 'glow_merge_no_power' : 'glow_merge',
    source,
    params,
    no_framebuffer: true,
  });
  blendModeReset(false);
}

function queuePostprocess(highlight_power: boolean, highlight_symmetry: boolean): void {
  let blur_factor = 1;
  effectsQueue(Z.POSTPROCESS, doBlurEffect.bind(null, blur_factor));
  effectsQueue(Z.POSTPROCESS + 1, doColorEffectEarly.bind(null, highlight_symmetry));
  spriteQueueFn(Z.POSTPROCESS_LATE, doColorEffectLate.bind(null, highlight_power, highlight_symmetry));
}

function drawTriangle(x: number, y: number, z: number, rh: number, rv: number, up: boolean, color: Vec4): void {
  let y0 = y + (up ? rv : -rv);
  let y1 = y + (up ? -rv : rv);
  drawLine(x - rh, y0, x + rh, y0, z, LINE_W, 1, color, LINE_CAP_ROUND);
  drawLine(x - rh, y0, x, y1, z, LINE_W, 1, color, LINE_CAP_ROUND);
  drawLine(x + rh, y0, x, y1, z, LINE_W, 1, color, LINE_CAP_ROUND);
}

type DemonVis = {
  aw: number;
  ah: number;
  bw: number;
  bh: number;
  bup: boolean;
  edx: number;
  edy: number;
};
let vis_cache: Partial<Record<number, DemonVis>> = {};
function getDemonVis(seed: number): DemonVis {
  let ret = vis_cache[seed];
  if (!ret) {
    rand.reseed(seed);
    let eye_angle = PI/4 + rand.random() * PI / 2;
    let eye_len = 0.05 + rand.random() * 0.05;
    ret = vis_cache[seed] = {
      aw: 0.2 + rand.random() * 0.2,
      ah: 0.2 + rand.random() * 0.2,
      bw: 0.3 + rand.random() * 0.2,
      bh: 0.05 + rand.random() * 0.1,
      bup: rand.random() > 0.5,
      edx: sin(eye_angle) * eye_len,
      edy: cos(eye_angle) * eye_len,
    };
  }
  return ret;
}
function rr(): number {
  return (0.95 + 0.05 * Math.random());
}
function drawDemonPortrait(target: DemonTarget, x: number, y: number, w: number): void {
  let vis = getDemonVis(target.seed);
  let xmid = x + w / 2;
  let ymid = y + w / 2;
  let aw = w * rr() * vis.aw;
  let ah = w * rr() * vis.ah;
  let head_y = ymid - w * 0.1;
  drawTriangle(xmid, head_y, Z.LINES, aw, ah, false, target.color);
  let bw = w * rr() * vis.bw;
  let bh = w * rr() * vis.bh;
  let torso_y = ymid + w * 0.1;
  drawTriangle(xmid, torso_y, Z.LINES, bw, bh, vis.bup, target.color);
  let eyey = ymid - w * 0.25;
  let eyex = xmid + w * 0.05;
  let edx = w * vis.edx;
  let edy = w * vis.edy;
  drawLine(eyex, eyey, eyex + edx, eyey + edy, Z.LINES, LINE_W, 1, target.color, LINE_CAP_ROUND);
  eyex = xmid - w * 0.05;
  drawLine(eyex, eyey, eyex - edx, eyey + edy, Z.LINES, LINE_W, 1, target.color, LINE_CAP_ROUND);
}

const RUNE_W = POWER_R * 1.5;

function formatMatch(v: number): string {
  if (v === 1000) {
    return '100%';
  }
  v = round(v/10);
  if (v === 100) {
    v = 99;
  }
  return `${v}%`;
}

const GRAPH_SCALE = 1.1;
const GRAPH_W = 940/2 * GRAPH_SCALE;
const GRAPH_H = 1536/2 * GRAPH_SCALE;
const GRAPH_R = 340/2 * GRAPH_SCALE;
const GRAPH_MIN_R = 0.1;
let eval_pos: [Vec2, Vec2, Vec2, Vec2] = [vec2(), vec2(), vec2(), vec2()];
function drawDemon2(): void {
  const { evaluation, target } = game_state;
  const x0 = game_width - GRAPH_W;
  let y = (game_height - GRAPH_H) / 2;
  sprite_graph.draw({
    x: x0,
    y,
    z: Z.GRAPH_OVERLAY,
    w: GRAPH_W,
    h: GRAPH_H,
  });

  let xc = x0 + GRAPH_W/2;
  let yc = y + 974/2*GRAPH_SCALE;
  v2set(eval_pos[0], x0 + 313/2*GRAPH_SCALE, y + 242/2*GRAPH_SCALE);
  v2set(eval_pos[1], x0 + (940 - 313)/2*GRAPH_SCALE, y + 242/2*GRAPH_SCALE);
  v2set(eval_pos[2], x0 + 313/2*GRAPH_SCALE, y + 422/2*GRAPH_SCALE);
  v2set(eval_pos[3], x0 + (940 - 313)/2*GRAPH_SCALE, y + 422/2*GRAPH_SCALE);

  let my_lines: [number, number][] = [];
  let my_y2: number[] = [];
  let target_lines: [number, number][] = [];
  let target_y2: number[] = [];
  const font_height = uiTextHeight() * 0.8 * GRAPH_SCALE;
  let target_hotspot = {
    x: x0, y: y + GRAPH_H - 80*GRAPH_SCALE,
    w: GRAPH_W, h: 60*GRAPH_SCALE,
  };
  let show_mine = !spot({
    def: SPOT_DEFAULT_LABEL,
    ...target_hotspot,
    sound_rollover: 'rollover',
  }).focused;
  if (!show_mine) {
    drawElipse(target_hotspot.x, target_hotspot.y, target_hotspot.x + target_hotspot.w, target_hotspot.y + target_hotspot.h,
      Z.UI - 1, 0.1, palette[PALETTE_TARGET_GLOW]);
  }
  for (let jj = 0; jj < EVALS.length; ++jj) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let [eval_type, ignored, dx, dy] = EVALS[jj];
    let range = ranges[eval_type];
    let my_value = evaluation[eval_type];
    let my_p = clamp((my_value - range[0]) / (range[1] - range[0]), 0, 1);
    let my_r = GRAPH_MIN_R + (1 - GRAPH_MIN_R) * my_p;
    let target_value = target[eval_type];
    let target_p = clamp((target_value - range[0]) / (range[1] - range[0]), 0, 1);
    let target_r = GRAPH_MIN_R + (1 - GRAPH_MIN_R) * target_p;
    let am_close = abs(target_p - my_p) < MATCH_PERFECT;

    let line_offs = my_r * GRAPH_R;
    let myx = xc + dx * line_offs;
    let myy = yc + dy * line_offs;
    my_lines.push([myx, myy]);
    my_y2.push(yc + dy * line_offs * 2);

    line_offs = target_r * GRAPH_R;
    let targetx = xc + dx * line_offs;
    let targety = yc + dy * line_offs;
    target_lines.push([targetx, targety]);
    target_y2.push(yc + dy * line_offs * 2);

    let value = `${round(show_mine ? my_value : target_value)}`;
    if (eval_type === 'power' || eval_type === 'symmetry') {
      value += '%';
    }
    let text_w = font.getStringWidth(style_eval, font_height, value);
    let desired_x = show_mine ? myx : targetx;
    let desired_y = (show_mine ? myy : targety) + 2*GRAPH_SCALE;
    const minipad = 8*GRAPH_SCALE;
    if (jj === 0) {
      desired_y -= font_height + 2*GRAPH_SCALE;
      desired_y = clamp(desired_y, yc - GRAPH_R + minipad, yc - font_height - minipad);
    } else if (jj === 2) {
      desired_y = clamp(desired_y, yc + minipad, yc + GRAPH_R - font_height - minipad);
    } else if (jj === 1) {
      desired_x = clamp(desired_x, xc + text_w/2 + minipad, xc + GRAPH_R - text_w/2 - minipad);
    } else if (jj === 3) {
      desired_x = clamp(desired_x, xc - GRAPH_R + text_w/2 + minipad, xc - text_w/2 - minipad);
    }
    font.drawSizedAligned(am_close ? style_eval_match : show_mine ? style_eval : style_eval_target2,
      desired_x, desired_y, Z.UI, font_height, ALIGN.HCENTER, 0, 0, value);

  }

  let last = my_lines[3];
  for (let ii = 0; ii < my_lines.length; ++ii) {
    let pos = my_lines[ii];
    drawLine(last[0], last[1], pos[0], pos[1], Z.LINES + 1, 3*GRAPH_SCALE, 1, [0.5,1,1,1]);
    last = pos;
  }

  let mxc = (my_lines[1][0] + my_lines[3][0]) / 2;
  let mxw = my_lines[3][0] - my_lines[1][0];
  if (0) {
    spriteQueueRaw4(sprite_radarrect.texs,
      xc + xc - mxc, my_y2[0],
      mxc + mxw, my_y2[1],
      xc + xc - mxc, my_y2[2],
      mxc - mxw, my_y2[3],
      50,
      0, 0, 1, 1,
      unit_vec);
  }

  // last = target_lines[3];
  // for (let ii = 0; ii < target_lines.length; ++ii) {
  //   let pos = target_lines[ii];
  //   drawLine(last[0], last[1], pos[0], pos[1], Z.LINES + 0.1, 2, 1, [1,0,0,1]);
  //   last = pos;
  // }
  let txc = (target_lines[1][0] + target_lines[3][0]) / 2;
  let txw = target_lines[3][0] - target_lines[1][0];
  spriteQueueRaw4(sprite_demonrect.texs,
    xc + xc - txc, target_y2[0],
    txc + txw, target_y2[1],
    xc + xc - txc, target_y2[2],
    txc - txw, target_y2[3],
    51,
    0, 0, 1, 1,
    unit_vec);

  let match = evalMatch(evaluation, target);
  font.draw({
    style: style_eval,
    x: xc, y: yc,
    w: GRAPH_R, h: GRAPH_R,
    size: font_height,
    align: ALIGN.HRIGHT | ALIGN.VBOTTOM,
    text: `${formatMatch(match)}`,
  });
}

const PAD = 8;

const BUTTONS_W = 120;
const color_disabled = vec4(0.6, 0.4, 1, 0.5);
function myButton(param: {
  x: number;
  y: number;
  icon: string;
  disabled?: () => boolean;
  tooltip?: string;
  hotkey?: () => boolean;
}): boolean {
  let disabled = Boolean(param.disabled && param.disabled());
  let button_param = {
    x: param.x,
    y: param.y,
    z: disabled ? Z.LINES : Z.UI,
    w: BUTTONS_W,
    h: BUTTONS_W,
    shrink: 1,
  };
  let sprite = autoAtlas('misc', disabled ? `${param.icon}` : `${param.icon}_hover`);
  let ret = Boolean(buttonImage({
    ...button_param,
    img: sprite,
    color: disabled ? color_disabled : undefined,
    no_bg: true,
    disabled,
    tooltip: param.tooltip,
  }));
  if (!ret && !disabled && param.hotkey && param.hotkey()) {
    playUISound('button_click');
    ret = true;
  }
  if (buttonWasFocused()) {
    autoAtlas('misc', 'button_glow').draw({
      ...button_param,
      z: button_param.z - 1,
    });
  }
  return ret;
}

const FIXED_LEVELS = 10;
let did_win = false;

const SCORE_COLUMNS = [
  // widths are just proportional, scaled relative to `width` passed in
  { name: '', width: 12, align: ALIGN.HFIT | ALIGN.HRIGHT | ALIGN.VCENTER },
  { name: 'Name', width: 60, align: ALIGN.HFIT | ALIGN.VCENTER },
  { name: 'Score', width: 20 },
];
const style_score = fontStyleColored(style_eval, 0xFFFFFFff);
const style_me = fontStyleColored(style_eval, 0xffd541ff);
const style_header = fontStyleColored(style_eval, 0x80FFFFff);
function myScoreToRow(row: unknown[], score: Score): void {
  row.push(formatMatch(score.match));
}

let overlay_active = false;
let show_initial_help = !engine.DEBUG;
let show_game_complete = false;

function drawLevel(): void {
  let x = PAD;
  let y = 80;
  let w = MC_X0 - POWER_R - x - PAD;
  let { target } = game_state;

  let text_height = uiTextHeight();
  font.draw({
    style: style_eval,
    x, y, w,
    size: text_height,
    align: ALIGN.HCENTER,
    text: `Target #${level_idx+1}:`,
  });

  let beat_level = game_state.best_score > 800 || engine.DEBUG;
  let show_high_scores = level_idx > 0 || beat_level;
  if (SCREENSHOT_MODE) {
    show_high_scores = false;
  }

  y += text_height + PAD;
  font.draw({
    style: style_eval,
    x, y, w,
    color: intColorFromVec4Color(target.color),
    size: text_height * 1.5,
    align: ALIGN.HCENTERFIT,
    text: target.name,
  });
  y += text_height * 1.5 + PAD;
  let demon_w_small = w/4;
  let demon_w = beat_level && !SCREENSHOT_MODE ? demon_w_small : w / 2;
  drawDemonPortrait(target, x + (w - demon_w)/2, y, demon_w);

  let button_w = BUTTONS_W;
  let button_y = y + (demon_w_small - BUTTONS_W) / 2;
  if (level_idx !== 0) {
    if (myButton({
      x,
      y: button_y,
      icon: 'left',
      hotkey: () => keyDownEdge(KEYS.MINUS),
    })) {
      level_idx--;
      getGameState();
    }
  }
  if (level_idx >= FIXED_LEVELS || beat_level || SCREENSHOT_MODE) {
    if (myButton({
      icon: 'right',
      x: x + w - button_w,
      y: button_y,
      hotkey: () => keyDownEdge(KEYS.EQUALS),
      disabled: () => level_idx === MAX_LEVEL - 1,
    })) {
      level_idx++;
      if (level_idx === FIXED_LEVELS && !did_win && !localStorageGetJSON(`save.${level_idx}`)) {
        did_win = true;
        show_game_complete = true;
      }
      getGameState();
    }
  }

  y += demon_w + PAD;

  font.draw({
    style: style_eval,
    x, y, w,
    size: text_height,
    align: ALIGN.HCENTER,
    text: `Current Match: ${formatMatch(game_state.cur_score)}`,
  });
  y += text_height + PAD * 2;
  font.draw({
    style: style_eval,
    x, y, w,
    size: text_height,
    align: ALIGN.HCENTER,
    text: `Your best: ${formatMatch(game_state.best_score)}`,
  });
  y += text_height + PAD * 2;

  if (!show_high_scores || !beat_level) {
    font.draw({
      style: style_eval,
      x, y, w,
      size: text_height,
      align: ALIGN.HCENTER,
      text: `Goal: ${formatMatch(800)}`,
    });
    y += text_height + PAD * 2;
  }

  if (!show_high_scores) {
    // no high scores
    return;
  }
  scoresDraw<Score>({
    score_system,
    allow_rename: !overlay_active,
    x,
    width: w,
    y,
    height: game_height - y,
    z: Z.UI,
    size: text_height,
    line_height: text_height + 2,
    level_index: level_idx,
    columns: SCORE_COLUMNS,
    scoreToRow: myScoreToRow,
    style_score,
    style_me,
    style_header,
    color_line: [1,1,1,1],
    color_me_background: [0.2,0.2,0.2,1],
  });
}

function leaveHelpAndEnterFullscreen(): void {
  show_initial_help = false;
  fscreenEnter();
}

const OVERLAY_X = 40;
const OVERLAY_W = game_width - OVERLAY_X * 2;
const OVERLAY_Y = 10;
const OVERLAY_H = game_height - OVERLAY_Y * 2;
const OVERLAY_HPAD = 200;
function doOverlay(type: 'help' | 'intro' | 'win'): void {
  overlay_active = true;

  let msg: string;
  if (type === 'intro') {
    msg = `[c=2]HINT: Press F11 to toggle full-screen.[/c]

[img=spacer]

Welcome, [c=1]Summoning Circle Specialist[/c]!

[img=spacer]

The Institution has been alerted to a number of demons causing havoc.  So that we can, uh, **deal** with them, please help us summon them here by designing a magic circle they will respond to!

[img=spacer]

Each demon has its own tastes, and will evaluate your magic circle based on its number of [c=0]Components[/c], distribution of [c=0]Power[/c], number of [c=0]Cells[/c], and [c=0]Symmetry[/c].

[img=spacer]

[c=2]HINT: View detailed help information at any time by selecting the [img=help scale=1.5] in the upper right.[/c]
`;
  } else if (type === 'help') {
    msg = `Demons evaluate magic circles by the following properties:

[img=spacer]

[c=0]Components[/c] - how many [c=1]circles[/c], [c=1]lines[/c], and runic [c=1]power[/c] nodes are drawn

[c=0]Power[/c] - how close every drawn element is to a runic [c=1]power[/c] node

[c=0]Cells[/c] - how many areas the empty space inside the circle is divided into

[c=0]Symmetry[/c] - a [c=1]line[/c] or [c=1]power[/c] node counts as symmetrical if it has a matching element [c=1]rotated 180 degrees[/c], or [c=1]two matching elements rotated equally[/c] in each direction, or a matching element [c=1]mirrored horizontally[/c].

[img=spacer]

A detailed analysis of your current magic circle is shown on the right, and additional details about [c=0]symmetry[/c], [c=0]power[/c] and [c=0]components[/c] are shown if you select the category.
`;
  } else if (type === 'win') {
    msg = `**Well done!**

[img=spacer]

You've adequately summoned **${FIXED_LEVELS}** demons, you should be proud.  Thanks for playing!

From here on out, there's an endless set of levels to play.`;
  } else {
    assert(false);
  }

  markdownAuto({
    font_style: style_help,
    x: OVERLAY_X + OVERLAY_HPAD,
    y: OVERLAY_Y,
    z: Z.OVERLAY,
    w: OVERLAY_W - OVERLAY_HPAD * 2,
    h: OVERLAY_H,
    align: ALIGN.HVCENTER | ALIGN.HWRAP,
    line_height: uiTextHeight() + 6,
    text: msg
  });

  if (type === 'intro' || type === 'win') {
    if (buttonText({
      x: (game_width - uiButtonWidth()) / 2,
      y: game_height - uiButtonHeight() - PAD,
      z: Z.OVERLAY + 2,
      text: type === 'intro' ? 'Let\'s go!' : 'I rock!',
      in_event_cb: show_initial_help && inputTouchMode() ? leaveHelpAndEnterFullscreen : undefined,
    })) {
      show_initial_help = false;
      show_game_complete = false;
    }
  }

  panel({
    x: OVERLAY_X,
    y: OVERLAY_Y,
    z: Z.OVERLAY - 1,
    w: OVERLAY_W,
    h: OVERLAY_H,
    pixel_scale: 4,
    sprite: autoAtlas('misc', 'overlay_panel'),
    color: [1,1,1,0.8],
  });
  drawRect(camera2d.x0Real(), camera2d.y0Real(), camera2d.x1Real(), camera2d.y1Real(), Z.OVERLAY - 2,
    [0,0,0,0.8]);
}

let want_music = !engine.DEBUG;
let mouse_pos = vec2();
let was_drag = false;
let highlight_toggle: Partial<Record<EvalType, boolean>> = {};
const HELP_W = 120;
const BUTTON_PAD = 16;
const HELP_X = game_width - BUTTON_PAD - HELP_W;
const HELP_Y = BUTTON_PAD;
const BUTTONS_X1 = game_width - BUTTON_PAD;
const BUTTONS_Y0 = game_height - BUTTON_PAD - BUTTONS_W;
const BUTTONS = [{
  icon: 'undo',
  tooltip: 'Undo [Ctrl-Z]',
  cb: function () {
    game_state.undo();
  },
  disabled: function () {
    return !game_state.canUndo();
  },
  hotkey: function () {
    return keyDown(KEYS.CTRL) && !keyDown(KEYS.SHIFT) && keyDownEdge(KEYS.Z);
  },
},{
  icon: 'redo',
  tooltip: 'Redo [Ctrl-Y]',
  cb: function () {
    game_state.redo();
  },
  disabled: function () {
    return !game_state.canRedo();
  },
  hotkey: function () {
    return keyDown(KEYS.CTRL) && (
      keyDownEdge(KEYS.Y) ||
      keyDown(KEYS.SHIFT) && keyDownEdge(KEYS.Z)
    );
  },
}, {
  icon: 'music',
  tooltip: 'Toggle background music',
  cb: function () {
    want_music = !want_music;
  },
}];

let music_playing = false;
let hack_once = false;
function tickMusic(): void {
  BUTTONS[2].icon = want_music ? 'music' : 'music_off';
  if (!soundResumed()) {
    return;
  }
  if (!music_playing && want_music) {
    soundPlayMusic('bgm', 0.5, FADE);
    music_playing = true;
    if (!hack_once) {
      hack_once = true;
      setTimeout(function () {
        soundPlayMusic('bgm', 0.5);
      }, 1000);
    }
  }
  if (music_playing && !want_music) {
    soundPlayMusic('bgm', 0, FADE);
    music_playing = false;
  }
}

function removeOverlappingLines(line: JSVec4): void {
  let { lines, circles } = game_state;
  let [c0, a0, c1, a1] = line;
  c0 = circles[c0];
  c1 = circles[c1];
  if (a0 > ANGLE_STEPS / 2) {
    c0 = -c0;
    a0 -= ANGLE_STEPS / 2;
  }
  if (a1 > ANGLE_STEPS / 2) {
    c1 = -c1;
    a1 -= ANGLE_STEPS / 2;
  }
  if (c0 > c1) {
    let t = c0;
    c0 = c1;
    c1 = t;
    t = a0;
    a0 = a1;
    a1 = t;
  }
  if (a0 !== a1) {
    return;
  }
  for (let ii = lines.length - 1; ii >= 0; --ii) {
    let other = lines[ii];
    if (other === line) {
      continue;
    }
    let [oc0, oa0, oc1, oa1] = other;
    oc0 = circles[oc0];
    oc1 = circles[oc1];
    if (oa0 > ANGLE_STEPS / 2) {
      oc0 = -oc0;
      oa0 -= ANGLE_STEPS / 2;
    }
    if (oa1 > ANGLE_STEPS / 2) {
      oc1 = -oc1;
      oa1 -= ANGLE_STEPS / 2;
    }
    if (oc0 > oc1) {
      let t = oc0;
      oc0 = oc1;
      oc1 = t;
      t = oa0;
      oa0 = oa1;
      oa1 = t;
    }
    if (oa0 !== oa1) {
      continue;
    }
    if (a0 === oa0 && a1 === oa1) {
      if (oc0 >= c0 && oc1 <= c1) {
        lines.splice(ii, 1);
      }
    }
  }
}

function removeOverlappingLinesFromPower(pos: [number, number]): void {
  let { lines, circles } = game_state;
  let [c, a] = pos;
  c = circles[c];
  for (let ii = lines.length - 1; ii >= 0; --ii) {
    let line = lines[ii];
    let [c0, a0, c1, a1] = line;
    c0 = circles[c0];
    c1 = circles[c1];
    let d = abs(c - c0) + abs(a - a0);
    if (d > 1) {
      continue;
    }
    d = abs(c - c1) + abs(a - a1);
    if (d > 1) {
      continue;
    }
    lines.splice(ii, 1);
  }
}

function statePlay(dt: number): void {
  overlay_active = false;
  gl.clearColor(palette[PALETTE_BG][0], palette[PALETTE_BG][1], palette[PALETTE_BG][2], 0);

  drawDemon2();

  tickMusic();

  let spot_ret = spot({
    def: SPOT_DEFAULT_LABEL,
    x: HELP_X,
    y: HELP_Y,
    w: HELP_W,
    h: HELP_W,
    pad_focusable: false,
    sound_rollover: 'rollover',
  });
  let show_help = spot_ret.focused || keyDown(KEYS.F1);
  autoAtlas('misc', show_help ? 'help' : 'help_hover').draw({
    x: HELP_X,
    y: HELP_Y,
    z: show_help ? Z.LINES : Z.UI,
    w: HELP_W,
    h: HELP_W,
  });
  if (show_help && !show_initial_help) {
    autoAtlas('misc', 'help_hover').draw({
      x: HELP_X,
      y: HELP_Y,
      z: Z.OVERLAY + 1,
      w: HELP_W,
      h: HELP_W,
    });
    autoAtlas('misc', 'button_glow').draw({
      x: HELP_X,
      y: HELP_Y,
      z: Z.OVERLAY + 0.5,
      w: HELP_W,
      h: HELP_W,
    });
  }

  if (show_initial_help) {
    doOverlay('intro');
  } else if (show_help) {
    doOverlay('help');
  } else if (show_game_complete) {
    doOverlay('win');
  }

  let buttonx = BUTTONS_X1;
  for (let ii = BUTTONS.length - 1; ii >= 0; --ii) {
    buttonx -= BUTTONS_W;
    let button = BUTTONS[ii];
    if (myButton({
      ...button,
      x: buttonx,
      y: BUTTONS_Y0,
    })) {
      button.cb();
    }
    buttonx -= PAD;
  }

  let highlight: Partial<Record<EvalType, boolean>> = {
    ...highlight_toggle,
  };
  let hover: Partial<Record<EvalType, boolean>> = {};
  const EVAL2_W = 314/2 * GRAPH_SCALE;
  const EVAL_TEXT_H = uiTextHeight() * 0.8*GRAPH_SCALE;
  const HOT_EXTRA = 20 * GRAPH_SCALE;
  for (let ii = 0; ii < EVALS.length; ++ii) {
    let pair = EVALS[ii];
    let v = game_state.evaluation[pair[0]];
    let value = `${round(v)}`;
    if (pair[0] === 'power') {
      value = `${value}%`;
    }
    let pos = eval_pos[ii];
    let xx = pos[0] - EVAL2_W/2;
    let yy = pos[1];
    if (pair[0] === 'symmetry') {
      value = `${game_state.symmap.symcount}/${game_state.symmap.symmax}`;
    }

    let hotspot = {
      x: xx,
      y: yy - EVAL_TEXT_H - HOT_EXTRA,
      w: EVAL2_W,
      h: EVAL_TEXT_H * 2 + HOT_EXTRA * 2,
    };
    if (pair[0] === 'symmetry' || pair[0] === 'power') {
      if (inputClick(hotspot)) {
        playUISound('button_click');
        let new_v = !highlight_toggle[pair[0]];
        if (new_v) {
          highlight_toggle = {};
        }
        highlight_toggle[pair[0]] = new_v;
      }
    }
    if (highlight_toggle[pair[0]]) {
      value = `[${value}]`;
    }
    font.draw({
      style: style_eval2,
      x: xx,
      y: yy,
      w: EVAL2_W,
      size: EVAL_TEXT_H,
      align: ALIGN.HCENTER,
      text: value,
    });
    let do_hover = false;
    if (spot({
      def: SPOT_DEFAULT_LABEL,
      ...hotspot,
      sound_rollover: 'rollover',
    }).focused) {
      do_hover = true;
      hover[pair[0]] = true;
      if (pair[0] === 'symmetry' && !highlight_toggle.power) {
        highlight.symmetry = true;
      } else if (pair[0] === 'power' && !highlight_toggle.symmetry) {
        highlight.power = true;
      } else {
        highlight[pair[0]] = !highlight[pair[0]];
      }
    }
    if (do_hover || highlight[pair[0]]) {
      drawElipse(hotspot.x, hotspot.y, hotspot.x + hotspot.w, hotspot.y + hotspot.h,
        Z.UI - 1, 0.1, palette[PALETTE_GLOW]);
    }
  }

  queuePostprocess(Boolean(highlight.power), Boolean(highlight.symmetry));

  let area_canvas_size = AREA_CANVAS_W / VIS_TO_CANVAS_SCALE;
  if (highlight.cells) {
    let area_sprite = game_state.getCellSprite();
    if (area_sprite) {
      area_sprite.draw({
        x: MC_XC - area_canvas_size / 2,
        y: MC_YC - area_canvas_size / 2,
        w: area_canvas_size,
        h: area_canvas_size,
      });
    }
  }
  if (highlight.power && false) {
    let power_sprite = game_state.getPowerSprite();
    if (power_sprite) {
      power_sprite!.draw({
        x: MC_XC - area_canvas_size / 2,
        y: MC_YC - area_canvas_size / 2,
        w: area_canvas_size,
        h: area_canvas_size,
      });
    }
  }
  tex2_transform[0] = camera2d.wReal() / area_canvas_size;
  tex2_transform[1] = -camera2d.hReal() / area_canvas_size;
  tex2_transform[2] = -((MC_XC - area_canvas_size / 2) - camera2d.x0Real()) / area_canvas_size;
  tex2_transform[3] = 1 + ((camera2d.y1Real() - (MC_YC + area_canvas_size / 2)) / area_canvas_size);

  drawLevel();

  let { circles, lines, power, placing } = game_state;

  let do_hover = mouseOver({
    x: MC_X0 - PAD*4, y: MC_Y0 - PAD*4,
    w: MC_W + PAD*8, h: MC_W + PAD*8,
    peek: true,
  });
  mousePos(mouse_pos);
  let drag;
  if (do_hover) {
    drag = inputDrag({
      //min_dist: MC_R / CIRCLE_STEPS * 0.75,
    });
  }

  const CIRCLE_INTERACT_DIST = MC_R / CIRCLE_STEPS / 2;

  let symerr_pal = highlight.symmetry ? PALETTE_SYMERROR_HIGHLIGHT : PALETTE_SYMERROR_NORMAL;

  let center_cursor_dist = v2dist(mouse_pos, [MC_XC, MC_YC]);
  let cursor_angle = round(atan2(mouse_pos[0] - MC_XC, mouse_pos[1] - MC_YC) * ANGLE_STEPS / (2 * PI));
  if (cursor_angle < 0) {
    cursor_angle += ANGLE_STEPS;
  }
  let cursor_circle = -1;
  let cursor_circle_dist = Infinity;
  let drag_start_center_cursor_dist = 0;
  let drag_start_angle = 0;
  let drag_start_circle = -1;
  let drag_start_circle_dist = Infinity;
  if (drag) {
    drag_start_center_cursor_dist = v2dist(drag.start_pos, [MC_XC, MC_YC]);
    drag_start_angle = round(atan2(drag.start_pos[0] - MC_XC, drag.start_pos[1] - MC_YC) * ANGLE_STEPS / (2 * PI));
    if (drag_start_angle < 0) {
      drag_start_angle += ANGLE_STEPS;
    }
  }
  for (let ii = 0; ii < circles.length; ++ii) {
    let r = circles[ii] / CIRCLE_STEPS * MC_R;
    drawCircleAA(MC_XC, MC_YC, Z.CIRCLES, r, LINE_W, 1, palette[PALETTE_CIRCLE]);

    let circle_cursor_dist = abs(center_cursor_dist - r);
    if (circle_cursor_dist < cursor_circle_dist &&
      circle_cursor_dist < CIRCLE_INTERACT_DIST
    ) {
      cursor_circle_dist = circle_cursor_dist;
      cursor_circle = ii;
    }

    if (drag) {
      let drag_start_circle_cursor_dist = abs(drag_start_center_cursor_dist - r);
      if (drag_start_circle_cursor_dist < drag_start_circle_dist &&
        drag_start_circle_cursor_dist < CIRCLE_INTERACT_DIST
      ) {
        drag_start_circle_dist = drag_start_circle_cursor_dist;
        drag_start_circle = ii;
      }
    }
  }

  if (drag) {
    if (drag_start_circle === cursor_circle && drag_start_angle === cursor_angle && !was_drag) {
      drag = null;
      drag_start_circle = -1;
    }
  }


  for (let ii = 0; ii < lines.length; ++ii) {
    let line = lines[ii];
    let [x0, y0] = circAngleToXY(line[0], line[1]);
    let [x1, y1] = circAngleToXY(line[2], line[3]);
    let pal = game_state.symmap.lines[ii] ? PALETTE_SYMMATCH : symerr_pal;
    drawLine(x0, y0, x1, y1, Z.LINES, LINE_W, 1, palette[pal]);
  }
  for (let ii = 0; ii < power.length; ++ii) {
    let pow = power[ii];
    let [x, y] = circAngleToXY(pow[0], pow[1]);
    drawCircle(x, y, Z.POWER, POWER_R, 1, palette[PALETTE_BG]);
    let symerror = !game_state.symmap.power[ii];
    let pal = highlight.power ? PALETTE_SYMMATCH : symerror ? symerr_pal : PALETTE_SYMMATCH;
    drawCircleAA(x, y, Z.POWER + (symerror ? 0.15 : 0.1), POWER_R, LINE_W, 1, palette[pal]);
    if (!highlight.cells) {
      let c = palette[pal];
      if (!highlight.power) {
        let power_w = max(0.0, 1.0 - abs(1.0 - pulse_param[3]) * 10.0);
        c = pulse_param;
        c = [c[0], c[1], c[2], power_w];
      }
      sprite_runes.draw({
        x: x - RUNE_W/2,
        y: y - RUNE_W/2,
        z: Z.RUNES,
        w: RUNE_W,
        h: RUNE_W,
        frame: (circles[pow[0]] * ANGLE_STEPS + pow[1]) % (sprite_runes.uidata!.rects as Array<Vec4>).length,
        color: c,
      });
    }
  }

  let right_click: [string, string, VoidFunc] | null = null;
  let left_click: [string, string, VoidFunc] | null = null;
  let drag_start: [string, string, VoidFunc] | null = null;
  let drag_stop: [string, string, VoidFunc] | null = null;
  if (do_hover && !drag) {
    // CIRCLE logic
    if (cursor_circle !== -1 && cursor_circle_dist < CIRCLE_INTERACT_DIST) {
      // near existing
      // drawCircleAA(MC_XC, MC_YC, Z.HOVER, circles[cursor_circle] / CIRCLE_STEPS * MC_R,
      //   LINE_W_DELETE, 1, palette[PALETTE_HOVER_DELETE]);
      right_click = [
        'Erase circle',
        'remove',
        function () {
          let tail = circles.length - 1;
          for (let ii = lines.length - 1; ii >= 0; --ii) {
            let line = lines[ii];
            if (line[0] === cursor_circle || line[2] === cursor_circle) {
              lines.splice(ii, 1);
            } else {
              if (line[0] === tail) {
                line[0] = cursor_circle;
              }
              if (line[2] === tail) {
                line[2] = cursor_circle;
              }
            }
          }
          for (let ii = power.length - 1; ii >= 0; --ii) {
            if (power[ii][0] === cursor_circle) {
              power.splice(ii, 1);
            } else if (power[ii][0] === tail) {
              power[ii][0] = cursor_circle;
            }
          }
          ridx(circles, cursor_circle);
        },
      ];
    } else {
      let circle_r = round(center_cursor_dist / MC_R * CIRCLE_STEPS);
      if (circle_r > CIRCLE_STEPS && circle_r < CIRCLE_STEPS + 4) {
        circle_r = CIRCLE_STEPS;
      }
      if (circle_r >= CIRCLE_MIN && circle_r <= CIRCLE_STEPS && !circles.includes(circle_r)) {
        drawCircleAA(MC_XC, MC_YC, Z.HOVER, circle_r / CIRCLE_STEPS * MC_R,
          LINE_W / 2, 1, palette[PALETTE_HOVER]);
        left_click = [
          'Draw circle',
          'add',
          function () {
            circles.push(circle_r);
          },
        ];
      }
    }
  }
  if (do_hover && drag_start_circle === -1) {
    // POWER logic
    if (cursor_circle_dist < CIRCLE_INTERACT_DIST) {
      // do rollover
      let screen_pos = circAngleToXY(cursor_circle, cursor_angle);
      let [tx, ty] = screen_pos;
      let pos: [number, number] = [cursor_circle, cursor_angle];
      let valid = true;
      for (let ii = 0; ii < power.length; ++ii) {
        let test = power[ii];
        let opos = circAngleToXY(test[0], test[1]);
        if (v2distSq(screen_pos, opos) < POWER_R * 2 * POWER_R * 2 && (
          screen_pos[0] !== opos[0] || screen_pos[1] !== opos[1]
        )) {
          valid = false;
        }
      }
      let would_remove = false;
      for (let ii = 0; ii < power.length; ++ii) {
        if (v2same(power[ii], pos)) {
          would_remove = true;
          break;
        }
      }
      if (would_remove) {
        drawCircle(tx, ty, Z.HOVER, POWER_R * 0.75, 0.5,
          palette[(would_remove || !valid) ? PALETTE_HOVER_DELETE : PALETTE_HOVER]);
      }
      if (valid) {
        left_click = [
          would_remove ? 'Erase Power Node' : 'Draw Power Node',
          would_remove ? 'remove' : 'add',
          function () {
            let removed = false;
            for (let ii = 0; ii < power.length; ++ii) {
              if (v2same(power[ii], pos)) {
                power.splice(ii, 1);
                removed = true;
                break;
              }
            }
            if (!removed) {
              power.push(pos);
              removeOverlappingLinesFromPower(pos);
            }
          },
        ];
        if (would_remove) {
          right_click = left_click;
        }
      }
    }
  }
  if (do_hover) {
    // LINE logic
    if (drag_start_circle !== -1) {
      if (!game_state.placing) {
        playUISound('drag_start');
      }
      placing = game_state.placing = [drag_start_circle, drag_start_angle];
      let [sx, sy] = circAngleToXY(drag_start_circle, drag_start_angle);
      drawCircle(sx, sy, Z.HOVER, LINE_W * 2, 0.5, palette[PALETTE_HOVER]);
    }
    if (cursor_circle_dist < CIRCLE_INTERACT_DIST) {
      // do rollover
      let line: JSVec4 = [0,0,0,0];
      let valid = true;
      if (placing) {
        line = [placing[0], placing[1], cursor_circle, cursor_angle];
        canonicalLine(line);
        if (cursor_circle === placing[0] && angleDiff(cursor_angle, placing[1]) < 5) {
          valid = false;
        }
      }
      let [tx, ty] = circAngleToXY(cursor_circle, cursor_angle);
      if (valid) {
        drawCircle(tx, ty, Z.HOVER, LINE_W * 2, 0.5, palette[PALETTE_HOVER]);
        if (placing) {
          let [sx, sy] = circAngleToXY(placing[0], placing[1]);
          let would_remove = false;
          for (let ii = 0; ii < lines.length; ++ii) {
            if (v4same(lines[ii], line)) {
              would_remove = true;
              break;
            }
          }
          drawLine(sx, sy, tx, ty, Z.HOVER, LINE_W_DELETE, 0.5,
            palette[would_remove ? PALETTE_HOVER_DELETE : PALETTE_HOVER]);
        }

        if (placing) {
          let would_remove = false;
          for (let ii = 0; ii < lines.length; ++ii) {
            if (v4same(lines[ii], line)) {
              would_remove = true;
              break;
            }
          }
          drag_stop = [
            would_remove ? 'Erase line' : 'Draw line',
            would_remove ? 'remove' : 'add',
            function () {
              let removed = false;
              for (let ii = 0; ii < lines.length; ++ii) {
                if (v4same(lines[ii], line)) {
                  lines.splice(ii, 1);
                  removed = true;
                  break;
                }
              }
              if (!removed) {
                lines.push(line);
                // also remove any lines this directly overlaps
                removeOverlappingLines(line);
              }
              placing = game_state.placing = null;
            },
          ];
        } else {
          drag_start = [
            'Draw/Erase line',
            'drag_start',
            nop,
          ];
          let line_to_remove: number | null = null;
          for (let ii = 0; ii < lines.length; ++ii) {
            if (lines[ii][0] === cursor_circle && lines[ii][1] === cursor_angle ||
              lines[ii][2] === cursor_circle && lines[ii][3] === cursor_angle
            ) {
              line_to_remove = ii;
            }
          }
          if (line_to_remove !== null) {
            let [sx, sy] = circAngleToXY(lines[line_to_remove][0], lines[line_to_remove][1]);
            let [tx2, ty2] = circAngleToXY(lines[line_to_remove][2], lines[line_to_remove][3]);
            drawLine(sx, sy, tx2, ty2, Z.HOVER, LINE_W_DELETE, 0.5, palette[PALETTE_HOVER_DELETE]);
            right_click = [
              'Erase line',
              'remove',
              function () {
                lines.splice(line_to_remove!, 1);
              },
            ];
          }
        }
      } else {
        assert(placing);
        drawCircle(tx, ty, Z.HOVER, LINE_W * 2, 0.5, palette[PALETTE_HOVER_DELETE]);
        let [sx, sy] = circAngleToXY(placing[0], placing[1]);
        drawLine(sx, sy, tx, ty, Z.HOVER, LINE_W_DELETE, 0.5,
          palette[PALETTE_HOVER_DELETE]);
        drag_stop = [
          'Draw line (too short)',
          '',
          nop,
        ];
      }
    } else if (placing) {
      let [sx, sy] = circAngleToXY(placing[0], placing[1]);
      drawLine(sx, sy, mouse_pos[0], mouse_pos[1], Z.HOVER, LINE_W_DELETE, 0.5,
        palette[PALETTE_HOVER]);
      drag_stop = [
        'Draw line',
        'add',
        nop,
      ];
    }
  }

  let text_height = uiTextHeight();
  if (left_click) {
    font.draw({
      style: style_help,
      x: game_width / 2,
      y: game_height - (text_height + PAD) * 3,
      align: ALIGN.HCENTER,
      text: `Left-click: ${left_click[0]}`,
    });
    if (inputClick({ button: 0 })) {
      if (left_click[2] !== nop) {
        if (left_click[1]) {
          playUISound(left_click[1]);
        }
        left_click[2]();
      }
      game_state.commit();
    }
  }
  if (drag_start || drag_stop) {
    font.draw({
      style: style_help,
      x: game_width / 2,
      y: game_height - (text_height + PAD) * 2,
      align: ALIGN.HCENTER,
      text: `Drag: ${drag_start ? drag_start[0] : drag_stop![0]}`,
    });
    if (drag && !was_drag && drag_start) {
      if (drag_start[1]) {
        playUISound(drag_start[1]);
      }
      drag_start[2]();
    }
    if (was_drag && !drag && drag_stop) {
      if (drag_stop[2] !== nop) {
        if (drag_stop[1]) {
          playUISound(drag_stop[1]);
        }
        drag_stop[2]();
      }
      game_state.commit();
    }
  } else {
    let gen_help = '';
    let yoffs = 0;
    if (hover.power) {
      gen_help = '[c=0]Power[/c] - how close every drawn element is to a runic [c=1]power[/c] node';
    } else if (hover.symmetry) {
      yoffs = text_height;
      gen_help = 'A [c=1]line[/c] or [c=1]power[/c] node is [c=0]Symmetrical[/c] if it there is a match [c=1]rotated 180 degrees[/c], or [c=1]rotated equally[/c] in each direction, or [c=1]mirrored horizontally[/c].';
    } else if (hover.components) {
      gen_help = '[c=0]Components[/c] - how many [c=1]circles[/c], [c=1]lines[/c], and runic [c=1]power[/c] nodes are drawn';
    } else if (hover.cells) {
      gen_help = '[c=0]Cells[/c] - how many areas the empty space inside the circle is divided into';
    }
    if (gen_help) {
      markdownAuto({
        font_style: style_help,
        x: game_width / 4,
        w: game_width / 2,
        y: game_height - (text_height + PAD) * 2 - yoffs,
        align: ALIGN.HCENTER | ALIGN.HWRAP,
        text: gen_help,
      });
    }
  }
  if (right_click) {
    font.draw({
      style: style_help,
      x: game_width / 2,
      y: game_height - (text_height + PAD),
      align: ALIGN.HCENTER,
      text: `Right-click: ${right_click[0]}`,
    });
    if (inputClick({ button: 2 }) || inputTouchMode() && longPress({ min_time: 1000 }) || keyDownEdge(KEYS.DEL)) {
      if (right_click[1]) {
        playUISound(right_click[1]);
      }
      right_click[2]();
      game_state.commit();
    }
  }

  was_drag = Boolean(drag);
  if (!drag) {
    game_state.placing = null;
  }
}

export function main(): void {
  if (engine.DEBUG) {
    // Enable auto-reload, etc
    netInit({ engine });
  }

  const font_info_ld55 = require('./img/font/ld55gochi.json');
  let pixely = 'off';
  let font_def = { info: font_info_ld55, texture: 'font/ld55gochi' };
  let ui_sprites: UISpriteSet = {};
  let pixel_perfect = 0;
  ([
    'progress_bar',
    'progress_bar_trough',
    'collapsagories',
    'collapsagories_rollover',
    'collapsagories_shadow_down',
    'menu_entry',
    'menu_selected',
    'menu_down',
    'menu_header',
    'slider',
    'slider_handle',
  ] as const).forEach((key) => {
    ui_sprites[key] = { atlas: 'default', name: 'button' };
  });

  effects.registerShader('glow_merge', {
    fp: 'shaders/effects_glow_merge.fp',
  });
  effects.registerShader('glow_merge_no_power', {
    fp: 'shaders/effects_glow_merge_no_power.fp',
  });
  effects.registerShader('glow_merge_power', {
    fp: 'shaders/effects_glow_merge_power.fp',
  });
  effects.registerShader('clear', {
    fp: 'shaders/effects_clear.fp',
  });

  if (!engine.startup({
    game_width,
    game_height,
    pixely,
    font: font_def,
    viewport_postprocess: false,
    antialias: false,
    ui_sprites,
    pixel_perfect,
    line_mode: 0,
    do_borders: false,
    show_fps: false,
  })) {
    return;
  }
  font = engine.font;

  uiBindSounds({
    button_click: { file: 'button_click', volume: 0.5 },
    rollover: { file: 'rollover', volume: 0.25 },
    add: ['add', 'add2', 'add3', 'add4', 'add5'],
    remove: ['remove', 'remove2', 'remove3', 'remove4'],
    drag_start: 'drag_start',
  });

  setFontStyles(style_eval);
  uiSetPanelColor([0, 0, 0, 0.9]);

  scaleSizes(32 / 32);
  setFontHeight(32);
  setButtonHeight(48);
  if (engine.DEBUG) {
    engine.border_color[0] = 0.1;
    engine.border_color[2] = 0.1;
  }

  init();

  engine.setState(statePlay);
}
