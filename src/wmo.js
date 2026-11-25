const L = {
  0: ['clear', 'בהיר'], 1: ['clear', 'בהיר ברובו'], 2: ['partly', 'מעונן חלקית'], 3: ['cloud', 'מעונן'],
  45: ['fog', 'ערפל'], 48: ['fog', 'ערפל כפור'],
  51: ['rain', 'טפטוף קל'], 53: ['rain', 'טפטוף'], 55: ['rain', 'טפטוף כבד'], 56: ['rain', 'טפטוף קפוא'], 57: ['rain', 'טפטוף קפוא'],
  61: ['rain', 'גשם קל'], 63: ['rain', 'גשם'], 65: ['rain', 'גשם כבד'], 66: ['rain', 'גשם קפוא'], 67: ['rain', 'גשם קפוא'],
  71: ['snow', 'שלג קל'], 73: ['snow', 'שלג'], 75: ['snow', 'שלג כבד'], 77: ['snow', 'גרגרי שלג'],
  80: ['rain', 'ממטרים קלים'], 81: ['rain', 'ממטרים'], 82: ['rain', 'ממטרים עזים'], 85: ['snow', 'ממטרי שלג'], 86: ['snow', 'ממטרי שלג עזים'],
  95: ['storm', 'סופת רעמים'], 96: ['storm', 'סופת רעמים וברד'], 99: ['storm', 'סופת רעמים וברד כבד'],
};
export function describe(code, isDay = true) {
  const [cat, label] = L[code] || ['cloud', 'מעונן'];
  const icon = cat === 'clear' ? (isDay ? 'sun' : 'moon') : cat === 'partly' ? (isDay ? 'cloud-sun' : 'cloud-moon') : cat;
  const hero = cat === 'clear' || cat === 'partly' ? (isDay ? 'day' : 'night') : cat;
  return { cat, label, icon, hero };
}
