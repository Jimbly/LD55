// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

import { Vec4, vec4 } from 'glov/common/vmath';

const adj: [string, Vec4][] = [
  ['Bloody', vec4(1,0,0,1)],
  ['Crimson', vec4(0.5,0,0,1)],
  ['Ghostly', vec4(0,0,1,1)],
  ['Poisonous', vec4(0,1,0,1)],
  ['Whimsical', vec4(1,0,1,1)],
  ['Drowned', vec4(0,1,1,1)],
  ['Sickly', vec4(1,1,0,1)],
  ['Shadow', vec4(0,0,0.5,1)],
];
const nadj = adj.length;
const noun = [
  'Wrath', 'Vengeance', 'Anger', 'Feaster', 'Pride', 'Lust', 'Gluttony', 'Avarice',
  'Hate', 'Whimsy', 'Sloth', 'Greed', 'Desire', 'Decay', 'Rot', 'Wretch', 'Scum',
];
let nnoun = noun.length;

export type RandProvider = {
  range(v: number): number;
};

export function randomDemonName(rand: RandProvider): [string, Vec4] {
  let adjchoice = adj[rand.range(nadj)];
  return [
    `${adjchoice[0]} ${noun[rand.range(nnoun)]}`,
    adjchoice[1],
  ];
}
