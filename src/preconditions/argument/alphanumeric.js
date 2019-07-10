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
const { ArgumentPrecondition, PreconditionResult } = require('patron.js');
const regex = /[^A-Z\d]/ig;

module.exports = new class Alphanumeric extends ArgumentPrecondition {
  constructor() {
    super({ name: 'alphanumeric' });
  }

  async run(cmd, msg, arg, args, val) {
    if (regex.test(val)) {
      return PreconditionResult.fromError(cmd, 'Only alphanumerical inputs are allowed.');
    }

    return PreconditionResult.fromSuccess();
  }
}();
