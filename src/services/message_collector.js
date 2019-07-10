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

module.exports = {
  collectors: new Map(),

  add(condition, callback, key) {
    this.collectors.set(key, {
      callback,
      condition
    });
  },

  check(msg) {
    for (const [key, val] of this.collectors) {
      if (val.condition(msg)) {
        val.callback(msg);
        this.remove(key);
      }
    }
  },

  remove(key) {
    this.collectors.delete(key);
  }
};
