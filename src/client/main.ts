/*eslint global-require:off*/
// eslint-disable-next-line import/order
const local_storage = require('glov/client/local_storage');
local_storage.setStoragePrefix('ld55'); // Before requiring anything else that might load from this

import * as effects from 'glov/client/effects';
import { effectsQueue } from 'glov/client/effects';
import * as engine from 'glov/client/engine';
import { ALIGN, Font, fontStyle, intColorFromVec4Color } from 'glov/client/font';
import { framebufferEnd } from 'glov/client/framebuffer';
import {
  KEYS,
  inputClick,
  mouseOver,
  mousePos,
} from 'glov/client/input';
import { localStorageGetJSON, localStorageSetJSON } from 'glov/client/local_storage';
import { netInit } from 'glov/client/net';
import { spriteSetGet } from 'glov/client/sprite_sets';
// import {
//   Sprite,
//   spriteCreate,
// } from 'glov/client/sprites';
import {
  LINE_CAP_ROUND,
  buttonText,
  drawCircle,
  drawLine,
  playUISound,
  scaleSizes,
  setButtonHeight,
  setFontHeight,
  uiButtonHeight,
} from 'glov/client/ui';
import { DataObject } from 'glov/common/types';
import { ridx } from 'glov/common/util';
import {
  Vec4,
  v2dist,
  v2distSq,
  v2same,
  v4same,
  vec2,
  vec4,
} from 'glov/common/vmath';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { PI, abs, atan2, cos, max, min, round, sin, sqrt } = Math;

window.Z = window.Z || {};
Z.BACKGROUND = 1;
Z.SPRITES = 10;
Z.CIRCLES = 10;
Z.LINES = 9;
Z.POWER = 11;
Z.POSTPROCESS = 15;
Z.HOVER = 20;

// Virtual viewport for our game logic
const game_width = 1920;
const game_height = 1080;

const palette = [
  vec4(1, 1, 1, 1),
  vec4(0, 1, 0.2, 1),
  vec4(0, 0, 0, 1),
  vec4(1, 0, 0, 1),
  vec4(0, 0, 1, 1),
  vec4(196/255, 17/255, 255/255, 1),
];
const PALETTE_CIRCLE = 0;
const PALETTE_LINE = 0;
const PALETTE_POWER = 1;
const PALETTE_BG = 2;
const PALETTE_HOVER = 4;
const PALETTE_HOVER_DELETE = 3;
const PALETTE_GLOW = 5;

const style_eval = fontStyle(null, {
  color: 0xFFFFFFff,
  glow_color: intColorFromVec4Color(palette[PALETTE_GLOW]),
  glow_inner: 0,
  glow_outer: 2.5,
});

const MC_X0 = 560;
const MC_Y0 = 155;
const MC_W = 800;
const MC_R = MC_W / 2;
const MC_XC = MC_X0 + MC_W/2;
const MC_YC = MC_Y0 + MC_W/2;
const LINE_W = 8;
const POWER_R = 50;

const CIRCLE_STEPS = 12;
const ANGLE_STEPS = 48;
const CIRCLE_MIN = 4;
type Mode = 'line' | 'circle' | 'power';
type EvalType = 'components' | 'ink';
type Evaluation = Record<EvalType, number>;
class GameState {
  circles: number[] = [8];
  lines: [number, number, number, number][] = [[0, 5, 0, 20]];
  power: [number, number][] = [[0, 15]];
  mode: Mode = 'line';
  placing: null | [number, number] = null;
  constructor() {
    if (engine.DEBUG) {
      let saved = localStorageGetJSON<DataObject>('state');
      if (saved) {
        this.circles = saved.circles as number[];
        this.lines = saved.lines as [number, number, number, number][];
        this.power = saved.power as [number, number][];
      }
    }
    this.evaluate();
  }
  commit(): void {
    localStorageSetJSON('state', this.toJSON());
    this.evaluate();
  }
  toJSON(): DataObject {
    return {
      circles: this.circles,
      lines: this.lines,
      power: this.power,
    };
  }

  evaluation!: Evaluation;
  evaluate(): void {
    let components = 0;
    let { circles, lines, power } = this;
    components += power.length;
    let ink = 0;
    for (let ii = 0; ii < circles.length; ++ii) {
      let r = circles[ii];
      ++components;
      ink += 2 * PI * r;
    }
    for (let ii = 0; ii < lines.length; ++ii) {
      let [c0, a0, c1, a1] = lines[ii];
      ++components;
      let r0 = circles[c0];
      let r1 = circles[c1];
      a0 = a0 / ANGLE_STEPS * 2 * PI;
      a1 = a1 / ANGLE_STEPS * 2 * PI;
      let x0 = sin(a0) * r0;
      let y0 = cos(a0) * r0;
      let x1 = sin(a1) * r1;
      let y1 = cos(a1) * r1;
      ink += sqrt((x1 - x0)*(x1 - x0) + (y1 - y0) * (y1 - y0));
    }
    for (let ii = 0; ii < power.length; ++ii) {
      ++components;
      ink += 3; // plus symbol?
    }
    this.evaluation = {
      components,
      ink,
    };
  }
}

let font: Font;

let game_state: GameState;
function init(): void {
  game_state = new GameState();
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

function doColorEffect(): void {
  let params = {
    color: palette[PALETTE_GLOW],
  };
  let source = [
    this_frame_source,
    framebufferEnd({ filter_linear: false, need_depth: false }),
  ];
  effects.applyCopy({
    shader: 'glow_merge',
    source,
    params,
  });
}

function queuePostprocess(): void {
  let blur_factor = 1;
  effectsQueue(Z.POSTPROCESS, doBlurEffect.bind(null, blur_factor));
  effectsQueue(Z.POSTPROCESS + 1, doColorEffect);
}

const MODES: [Mode, string][] = [
  ['circle', 'O'],
  ['line', '/'],
  ['power', 'P'],
];

const EVALS: [EvalType, string][] = [
  ['components', 'Components'],
  ['ink', 'Ink'],
];

const EVAL_W = 200;
const PAD = 8;
let mouse_pos = vec2();
function statePlay(dt: number): void {
  gl.clearColor(palette[PALETTE_BG][0], palette[PALETTE_BG][1], palette[PALETTE_BG][2], 0);
  queuePostprocess();
  let { circles, lines, power, mode, placing } = game_state;

  let button_height = uiButtonHeight();
  let xx = (game_width - MODES.length * (button_height + PAD) - PAD) / 2;
  for (let ii = 0; ii < MODES.length; ++ii) {
    let pair = MODES[ii];
    if (buttonText({
      x: xx,
      y: game_height - button_height,
      w: button_height,
      h: button_height,
      text: pair[1],
      disabled: mode === pair[0],
      hotkey: KEYS['1'] + ii,
    })) {
      mode = game_state.mode = pair[0];
      game_state.placing = null;
    }
    xx += button_height + PAD;
  }

  xx = (game_width - EVALS.length * (EVAL_W + PAD) - PAD) / 2;
  for (let ii = 0; ii < EVALS.length; ++ii) {
    let pair = EVALS[ii];
    let v = game_state.evaluation[pair[0]];
    font.draw({
      style: style_eval,
      x: xx,
      y: 10,
      w: EVAL_W,
      align: ALIGN.HCENTER | ALIGN.HWRAP,
      text: `${pair[1]}\n${round(v)}`,
    });
    xx += EVAL_W + PAD;
  }

  let do_hover = mouseOver({
    x: MC_X0 - PAD, y: MC_Y0 - PAD,
    w: MC_W + PAD, h: MC_W + PAD,
    peek: true,
  });
  mousePos(mouse_pos);

  let center_cursor_dist = v2dist(mouse_pos, [MC_XC, MC_YC]);
  let cursor_angle = round(atan2(mouse_pos[0] - MC_XC, mouse_pos[1] - MC_YC) * ANGLE_STEPS / (2 * PI));
  let cursor_circle = -1;
  let cursor_circle_dist = Infinity;
  for (let ii = 0; ii < circles.length; ++ii) {
    let r = circles[ii] / CIRCLE_STEPS * MC_R;
    drawCircleAA(MC_XC, MC_YC, Z.CIRCLES, r, LINE_W, 1, palette[PALETTE_CIRCLE]);

    let circle_cursor_dist = abs(center_cursor_dist - r);
    if (circle_cursor_dist < cursor_circle_dist) {
      cursor_circle_dist = circle_cursor_dist;
      cursor_circle = ii;
    }
  }
  if (mode === 'circle' && do_hover) {
    if (cursor_circle !== -1 && cursor_circle_dist < MC_R/CIRCLE_STEPS/2) {
      // near existing
      drawCircleAA(MC_XC, MC_YC, Z.HOVER, circles[cursor_circle] / CIRCLE_STEPS * MC_R,
        LINE_W / 2, 1, palette[PALETTE_HOVER_DELETE]);
      if (inputClick()) {
        playUISound('button_click');
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
        game_state.commit();
      }
    } else {
      let circle_r = round(center_cursor_dist / MC_R * CIRCLE_STEPS);
      if (circle_r > CIRCLE_STEPS && circle_r < CIRCLE_STEPS + 4) {
        circle_r = CIRCLE_STEPS;
      }
      if (circle_r >= CIRCLE_MIN && circle_r <= CIRCLE_STEPS) {
        drawCircleAA(MC_XC, MC_YC, Z.HOVER, circle_r / CIRCLE_STEPS * MC_R,
          LINE_W / 2, 1, palette[PALETTE_HOVER]);
        if (inputClick()) {
          playUISound('button_click');
          circles.push(circle_r);
          game_state.commit();
        }
      }
    }
  }
  if (mode === 'line' && do_hover) {
    if (placing) {
      let [sx, sy] = circAngleToXY(placing[0], placing[1]);
      drawCircle(sx, sy, Z.HOVER, LINE_W * 2, 0.5, palette[PALETTE_HOVER]);
    }
    if (cursor_circle_dist < MC_R / 2) {
      // do rollover
      let line: [number, number, number, number] = [0,0,0,0];
      let valid = true;
      if (placing) {
        line = [placing[0], placing[1], cursor_circle, cursor_angle];
        if (line[0] > line[2] || line[0] === line[2] && line[1] > line[3]) {
          line = [cursor_circle, cursor_angle, placing[0], placing[1]];
        }
        if (cursor_circle === placing[0] && angleDiff(cursor_angle, placing[1]) < 5) {
          valid = false;
        }
      }
      let [tx, ty] = circAngleToXY(cursor_circle, cursor_angle);
      if (valid && inputClick()) {
        playUISound('button_click');
        if (placing) {
          if (cursor_circle === placing[0] && cursor_angle === placing[1]) {
            placing = game_state.placing = null;
          } else {
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
            }
            game_state.commit();
            placing = game_state.placing = null;
          }
        } else {
          placing = game_state.placing = [cursor_circle, cursor_angle];
        }
      } else {
        drawCircle(tx, ty, Z.HOVER, LINE_W * 2, 0.5, palette[valid ? PALETTE_HOVER : PALETTE_HOVER_DELETE]);
        if (placing) {
          let [sx, sy] = circAngleToXY(placing[0], placing[1]);
          let would_remove = false;
          for (let ii = 0; ii < lines.length; ++ii) {
            if (v4same(lines[ii], line)) {
              would_remove = true;
              break;
            }
          }
          drawLine(sx, sy, tx, ty, Z.HOVER, LINE_W / 2, 0.5,
            palette[(would_remove || !valid) ? PALETTE_HOVER_DELETE : PALETTE_HOVER]);
        }
      }
    }
  }
  if (mode === 'power' && do_hover) {
    if (cursor_circle_dist < MC_R / 2) {
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
      if (valid && inputClick()) {
        playUISound('button_click');
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
        }
        game_state.commit();
      } else {
        let would_remove = false;
        for (let ii = 0; ii < power.length; ++ii) {
          if (v2same(power[ii], pos)) {
            would_remove = true;
            break;
          }
        }
        drawCircle(tx, ty, Z.HOVER, POWER_R * 0.75, 0.5,
          palette[(would_remove || !valid) ? PALETTE_HOVER_DELETE : PALETTE_HOVER]);
      }
    }
  }
  for (let ii = 0; ii < lines.length; ++ii) {
    let line = lines[ii];
    let [x0, y0] = circAngleToXY(line[0], line[1]);
    let [x1, y1] = circAngleToXY(line[2], line[3]);
    drawLine(x0, y0, x1, y1, Z.LINES, LINE_W, 1, palette[PALETTE_LINE]);
  }
  for (let ii = 0; ii < power.length; ++ii) {
    let pow = power[ii];
    let [x, y] = circAngleToXY(pow[0], pow[1]);
    drawCircle(x, y, Z.POWER, POWER_R, 1, palette[PALETTE_BG]);
    drawCircleAA(x, y, Z.POWER + 0.1, POWER_R, LINE_W, 1, palette[PALETTE_POWER]);
  }
}

export function main(): void {
  if (engine.DEBUG) {
    // Enable auto-reload, etc
    netInit({ engine });
  }

  const font_info_04b03x2 = require('./img/font/04b03_8x2.json');
  const font_info_04b03x1 = require('./img/font/04b03_8x1.json');
  const font_info_palanquin32 = require('./img/font/palanquin32.json');
  let pixely = 'off';
  let font_def;
  let ui_sprites;
  let pixel_perfect = 0;
  if (pixely === 'strict') {
    font_def = { info: font_info_04b03x1, texture: 'font/04b03_8x1' };
    ui_sprites = spriteSetGet('pixely');
    pixel_perfect = 1;
  } else if (pixely && pixely !== 'off') {
    font_def = { info: font_info_04b03x2, texture: 'font/04b03_8x2' };
    ui_sprites = spriteSetGet('pixely');
  } else {
    font_def = { info: font_info_palanquin32, texture: 'font/palanquin32' };
  }

  effects.registerShader('glow_merge', {
    fp: 'shaders/effects_glow_merge.fp',
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
  })) {
    return;
  }
  font = engine.font;

  // Perfect sizes for pixely modes
  scaleSizes(32 / 32);
  setFontHeight(32);
  setButtonHeight(92);
  if (engine.DEBUG) {
    engine.border_color[0] = 0.1;
    engine.border_color[2] = 0.1;
  }

  init();

  engine.setState(statePlay);
}
