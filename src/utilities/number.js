/**
 * Reborn - The core control of the only truly free and fair discord server.
 * Copyright (C) 2019 John Boyer
 *
 * Reborn is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Reborn is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
'use strict';
const formatter = Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});
const to_cents = 100;

module.exports = {
  value(num) {
    return num / to_cents;
  },

  format(num, cents = false) {
    return formatter.format(cents ? this.value(num) : num);
  },

  msToTime(input) {
    /* eslint-disable no-magic-numbers */
    return {
      milliseconds: parseInt(input % 1000 / 100),
      seconds: parseInt(input / 1000 % 60),
      minutes: parseInt(input / (1000 * 60) % 60),
      hours: parseInt(input / (1000 * 60 * 60) % 24),
      days: parseInt(input / (1000 * 60 * 60 * 24))
    };
    /* eslint-enable no-magic-numbers */
  }
};
