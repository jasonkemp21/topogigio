/* ---------- facts about the restaurant, from topogigiochicago.com as read on 2026-11-17 ---------- */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/* minutes after midnight, Chicago time. null is closed. */
const HOURS = [
  { open: 960, close: 1260 },                                 // Sunday 4:00 to 9:00
  null,                                                       // Monday
  { open: 690, close: 1320, lunch: true },                    // Tuesday 11:30 to 10:00
  { open: 690, close: 1320, lunch: true },
  { open: 690, close: 1320, lunch: true },
  { open: 690, close: 1350, lunch: true, late: true },        // Friday 11:30 to 10:30
  { open: 690, close: 1350, lunch: true, late: true },
];
const LUNCH_END = 900;                                        // 3:00 pm
const OPENTABLE = 'https://www.opentable.com/r/topo-gigio';
const PHONE = '(312) 266-9355';

/* the dishes the restaurant's own banquet page says guests rave about, plus the pasta that carries its name */
const FAVOURITES = ['Brodetto di Cozze al Pomodoro', 'White Fish al Limone e Capperi', 'Conchiglie alla Sarda', 'Rigatoni al Filo di Fumo', 'Fusilli alla Topo Gigio', 'Tiramisu'];

/* short excerpts from Google reviews, read 2026-11-17 */
const QUOTES = [
  'Easily one of the best risottos I’ve ever had!',
  'The calamari was so light and crunchy.',
  'The outdoor patio was lovely and made the whole dining experience even better.',
];

const DIET = { GF: 'Gluten free', V: 'Vegetarian', P: 'Pescatarian' };
const MENUS = {
  dinner: { title: 'Dinner', when: 'Tuesday to Saturday from 3:00 pm. Sunday 4:00 to 9:00 pm. Ask about the daily specials.' },
  lunch: { title: 'Lunch', when: 'Tuesday to Saturday, 11:30 am to 3:00 pm. Ask about the daily specials.' },
  drinks: { title: 'Wine and cocktails', when: 'Wines are priced by the bottle. The list changes with vintages and seasons, so call if you have your heart set on one.' },
};
const MENU_NOTES = {
  food: [
    ['Allergies', 'Tell your server about any allergy or dietary restriction before you order.'],
    ['Gluten-free pasta', 'Available for a $3 upcharge.'],
    ['Split plates', '$4 charge.'],
    ['Prices', 'Prices change with the market. Call first if you have concerns.'],
    ['Cooked to order', 'Consuming raw or undercooked meats, poultry, seafood, shellfish or eggs may increase your risk of foodborne illness.'],
  ],
  drinks: [
    ['Corkage', '$25 a bottle, up to three bottles.'],
    ['The list', 'Wines change with vintages and seasons. Call for the current list.'],
  ],
};
