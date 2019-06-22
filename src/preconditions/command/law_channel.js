/**
 * Reborn - The core control of the only truly free and fair discord server.
 * Copyright (C) 2019  John Boyer
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
const { Precondition, PreconditionResult } = require('patron.js');
const db = require('../../services/database.js');

module.exports = new class LawChannel extends Precondition {
  constructor() {
    super({ name: 'law_channel' });
  }

  async run(cmd, msg) {
    const { law_channel } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const channel = msg.channel.guild.channels.get(law_channel);

    if (!law_channel) {
      return PreconditionResult.fromError(cmd, 'The Law channel must be set.');
    } else if (!channel) {
      return PreconditionResult.fromError(
        cmd, 'The Law channel was deleted and must be set again.'
      );
    }

    return PreconditionResult.fromSuccess();
  }
}();
