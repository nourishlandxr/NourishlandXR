// The original NL layers and design ideas, edited for a first visual introduction.
export const GUIDE_LAYERS = Object.freeze({
  canopy:{name:'Canopy',copy:'The tallest trees shape light, shade and shelter. Their mature size affects the growing space below.',point:[34,18]},
  primary:{name:'Smaller trees',copy:'Fruit and other smaller trees fill the space below the canopy. Their height and spacing influence light and access.',point:[48,27]},
  shrub:{name:'Shrubs',copy:'Shrubs add fruit, flowers and shelter between trees and lower plants. Their role depends on the species and the place.',point:[56,37]},
  herbaceous:{name:'Herbs',copy:'Non-woody plants bring food, flowers, seasonal growth and material for the soil. Some prefer sun; others suit shade.',point:[58,48]},
  surface:{name:'Groundcover',copy:'Low plants and fallen leaves cover the soil surface. They help shape moisture, habitat and the space between larger plants.',point:[47,55]},
  root:{name:'Roots',copy:'Roots grow through different depths of soil, taking up water and nutrients. They share the underground space with fungi and other soil life.',point:[42,65]},
  climber:{name:'Climbers',copy:'Vines use vertical supports to reach light. Their growth needs to suit the support and the plants around them.',point:[27,40]}
});
export const GUIDE_DESIGNS = Object.freeze({
  blend:{name:'A mix shaped by your place.',copy:'Beauty, harvest and ease of care can work together. These are overlapping design tendencies; the balance changes with a place and the people who use it.',point:[50,55],tone:'#69856c'},
  efficient:{name:'Efficient',copy:'Clear paths, considered spacing and plants suited to the site. Think about access, useful roles and the work needed to care for the place.',point:[24,74],tone:'#78936b'},
  productive:{name:'Productive',copy:'A focus on useful crops and harvests. Consider what people want to grow, when crops are ready and how they will be gathered and used.',point:[76,74],tone:'#b48259'},
  ornamental:{name:'Ornamental',copy:'Colour, scent, texture and spaces for wandering. Beauty can invite people to slow down, notice wildlife and enjoy being in the food forest.',point:[50,26],tone:'#78989a'}
});
export const GUIDE_PEOPLE = Object.freeze({
  rest:{name:'A place to pause.',copy:'Shade, a comfortable seat, a book. Make space to slow down, feel calm and enjoy being close to nature.',point:[18,42]},
  connect:{name:'A place to come together.',copy:'Welcoming paths and places to gather make room for conversation, shared harvests and time spent with others.',point:[88,42]},
  discover:{name:'A place to be curious.',copy:'Notice an unfamiliar insect, a new flower or a changing leaf. Small discoveries can invite questions and a closer connection with nature.',point:[57,66]}
});
