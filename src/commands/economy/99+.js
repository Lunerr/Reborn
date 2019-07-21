const Gambling = require('../../templates/gambling.js');
const odds = 99;
const payout = 89;

module.exports = new Gambling(
  ['99+'], 'Roll 99.00 or higher on a 100.00 sided die to win 90X your bet.', odds, payout
);
