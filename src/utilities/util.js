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
const default_delay = 2e3;
const number = require('./number.js');
const hours_per_day = 24;

module.exports = {
  get_time(time, soon = false) {
    const { days, hours, minutes, seconds } = number.msToTime(time);
    const total_hours = (days * hours_per_day) + hours;

    if (total_hours >= 1) {
      return `${total_hours} hours${minutes ? ` and ${minutes} minutes` : ''}`;
    } else if (minutes >= 1) {
      return `${minutes} minutes${seconds ? ` and ${seconds} seconds` : ''}`;
    } else if (seconds >= 1 || !soon) {
      return `${seconds} seconds`;
    }

    return 'a short period';
  },

  delay(time = default_delay) {
    return new Promise(r => setTimeout(r, time));
  },

  escape_markdown(content) {
    return content.replace(/(\*|~|`|_|\|)+/g, '');
  },

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  },

  chunk(arr, size) {
    const chunked = [];

    for (let i = 0; i < arr.length; i += size) {
      chunked.push(arr.slice(i, i + size));
    }

    return chunked;
  }
};
