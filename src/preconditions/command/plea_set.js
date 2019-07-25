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
const { config } = require('../../services/data.js');
const db = require('../../services/database.js');
const util = require('../../utilities/util.js');
const conversion = 36e5;

module.exports = new class PleaSet extends Precondition {
  constructor() {
    super({ name: 'plea_set' });
  }

  async run(cmd, msg) {
    const channel_case = db.get_channel_case(msg.channel.id);
    const ms = config.auto_pick_lawyer * conversion;
    const time_left = util.get_time(
      channel_case.created_at + ms - Date.now(), true
    );

    if (channel_case.plea === null) {
      return PreconditionResult.fromError(cmd, `The lawyer must be give their plea before this \
case can go any further.\n\nIf a plea is not given in ${time_left}, the \
lawyer will be automatically replaced.`);
    }

    return PreconditionResult.fromSuccess();
  }
}();
