LD55 - Summoning
============================

Ludum Dare 55 Entry by Jimbly - "Title TBD"

* Play here: [dashingstrike.com/LudumDare/LD55/](http://www.dashingstrike.com/LudumDare/LD55/)
* Using [Javascript libGlov/GLOV.js framework](https://github.com/Jimbly/glovjs)

Acknowledgements:
* [KHScala](https://www.dafont.com/khscala.font) font

Start with: `npm start` (after running `npm i` once)


TODO:
* Do X through Power to indicate deleting, not red circle
* Highlight all lines and power red when highlighting a circle that would be deleted
* hover/etc is pretty crappy on mobile (post-jam fix?)


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
  Power      0 - 100