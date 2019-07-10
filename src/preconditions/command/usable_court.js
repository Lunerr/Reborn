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
const db = require('../../services/database.js');
const { Precondition, PreconditionResult } = require('patron.js');

module.exports = new class UsableCourt extends Precondition {
  constructor() {
    super({ name: 'usable_court' });
  }

  async run(cmd, msg) {
    const { court_category } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const channel = msg.channel.guild.channels.get(court_category);

    if (!court_category || !channel) {
      return PreconditionResult.fromError(cmd, 'The Court category channel needs to be set.');
    }

    return PreconditionResult.fromSuccess();
  }
}();
