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
const db = require('../../services/database.js');

module.exports = new class DefendantOnly extends Precondition {
  constructor() {
    super({ name: 'defendant_only' });
  }

  async run(cmd, msg) {
    const channel_case = db.get_channel_case(msg.channel.id);

    if (channel_case.defendant_id !== msg.author.id) {
      return PreconditionResult.fromError(
        cmd, 'Only the defendant of the case can use this command.'
      );
    }

    return PreconditionResult.fromSuccess();
  }
}();
