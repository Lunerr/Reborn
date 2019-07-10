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
const { Precondition, PreconditionResult } = require('patron.js');
const system = require('../../utilities/system.js');

module.exports = new class IsChief extends Precondition {
  constructor() {
    super({ name: 'is_chief' });
  }

  async run(cmd, msg) {
    const chief_role = system.chief_role(msg.member);

    if (!chief_role) {
      return PreconditionResult.fromError(cmd, 'This command may only be used be a Chief.');
    }

    return PreconditionResult.fromSuccess();
  }
}();
