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
const discord = require('../../utilities/discord.js');
const { Precondition, PreconditionResult } = require('patron.js');

module.exports = new class Congress extends Precondition {
  constructor() {
    super({ name: 'congress' });
  }

  async run(cmd, msg) {
    const {
      congress_role, house_speaker_role
    } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const role = msg.channel.guild.roles.get(congress_role);
    const not_speaker = house_speaker_role && !msg.member.roles.includes(house_speaker_role);

    if (!congress_role || !role) {
      return PreconditionResult.fromError(cmd, 'The Congress role needs to be set.');
    } else if (!discord.usable_role(msg.channel.guild, role)) {
      return PreconditionResult.fromError(
        cmd, 'The Congress role needs to be lower than me in hierarchy.'
      );
    } else if (!msg.member.roles.includes(congress_role) && not_speaker) {
      return PreconditionResult.fromError(
        cmd, 'Only members of Congress can use this command.'
      );
    }

    return PreconditionResult.fromSuccess();
  }
}();
