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
const minAmount = 3;

module.exports = {
  to_uppercase(str, force_lower = false) {
    let rest = str.slice(1);

    if (force_lower) {
      rest = rest.toLowerCase();
    }

    return `${str[0].toUpperCase()}${rest}`;
  },

  format(str, ...args) {
    return str.replace(/{(\d+)}/g, (_, a) => args[a]);
  },

  list(arr, sep = 'and') {
    if (arr.length < minAmount) {
      return arr.join(` ${sep} `);
    }

    return `${arr.slice(0, arr.length - 1).join(', ')}, ${sep} ${arr[arr.length - 1]}`;
  }
};
