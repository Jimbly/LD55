LD55 - Summoning
============================

Ludum Dare 55 Entry by Jimbly - "Title TBD"

* Play here: [dashingstrike.com/LudumDare/LD55/](http://www.dashingstrike.com/LudumDare/LD55/)
* Using [Javascript libGlov/GLOV.js framework](https://github.com/Jimbly/glovjs)

Acknowledgements:
* [GochiHand](https://fonts.google.com/specimen/Gochi+Hand) font
* [KHScala](https://www.dafont.com/khscala.font) font

Start with: `npm start` (after running `npm i` once)

Gameplay option 1: Idle summoning
* timer ticks down as you work
* maybe have to click summon when it's ready
* demon shows up, gives knowledge, and (possibly) increases value (max of 100 for each demon type)
* if everything known and match is better than the last one, can click summoning bar to speed up?  except, don't know which demon we'll get?
  * or, can just trigger a manual summon at any time
    * doesn't give you knowledge or a better result if the parameters aren't better?
  * or, once fully known, just instant-summon any time the parameters have improved upon one?
* advance to next zone at your leisure
* score is value of each summed up (high score for 3 zones plus total as a set?)
  * any way to work in fewer manual summons?
* Pros: discovery and exploration, slot machine
* Cons: probably needs great music

Gameplay option 2: Targeted
* given a single demon with known goals
* optimize your circle until it's good enough (beyond ~80% allowed to advance?)
* advance to next one
  * or, see queue, and choose which to summon / always summon the best match, and replace it
* high score for each demon and for the first 10 as a set
* 4-point start for metrics instead of bars is cool
* Pros: simplest, just a circle building puzzle
* Cons: no discovery or experimentation

Gameplay option 3: Manual summoning
* Either summoning takes time (long animation, or minigame), or we have a limited number of summons, or this doesn't work
  * probably limited number of summons, except makes gaming the high score system weird?
* Get a random demon and gain knowledge and value from the catch
* Pros: discovery and exploration
* Cons: poor high score (maybe don't care?), restarting once you know something seems viable?

Plan:
* summoning power charges up, can then hit button to summon
  * first step: add button and knowledge subsystem
* weighted randomly summons a demon
  * only out of those which either need knowledge or would up their high score
  * just show a message if there is no improvement to be made and all knowledge is known
* pop-up with animation
  * what's the MVP non-animated version of this?
  * zoom in on the appropriate panel
  * fade in if it's a new demon
  * animate up max value or floater
  * animate up knowledge increase
  * blink new bars revealed
  * zoom back out
* show total score (and high score chart once you've got ~50% of a demon?)
* allow advancing to the next zone once you're over 50% of value? knowledge?
* maybe final combined high score for 3 zones - or just total wealth, don't do a per-level high score, can then add some randomness to discovery?

TODO:
* Probably: need some way to be viewing sym and power at the same time
  * sym by colors (red/white)
  * power by pulses (green?) running along it, with runes only showing up during pulse
* better demon heads
* Do X through Power to indicate deleting, not red circle
* Highlight all lines and power red when highlighting a circle that would be deleted
* hover/etc is pretty crappy on mobile (post-jam fix?)

Polish:
* Click on target to expand and focus, show target values under 4 evaluations at top / color code them?
* Remove short line when drawing a larger line directly over it
* Remove short line when a power node completely consumes it

Limits:
  100 cells in 13 components - 464 ink
    0 power = 13 comp
    90 power = 17 comp
  56 cells in 10 components

  trying low cells, high components:
    37 components, 22 cells, 307 ink, 97 power
    34 components, 5 cells, 297 ink, 99 power (lots of power

  low components
    3 components, 1 cell, 100 power
    7 components, 26 cells, 0 power
    5 components, 4 cells, 314 ink, 0 power

  low ink
    113 ink, 8 comp, 29 cells
    98 ink, 25 comp, 5 cells
    52 ink, 10 comp, 100 power
    25 ink, 0 all
    31 ink, 100 power/sym

  Components 1 - 40
  Cells      1 - 50
  Ink        25 - 450
  Sym        0 - 100
  Power      5 - 100