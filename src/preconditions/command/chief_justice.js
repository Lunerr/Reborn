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
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const { Precondition, PreconditionResult } = require('patron.js');

module.exports = new class ChiefJustice extends Precondition {
  constructor() {
    super({ name: 'chief_justice' });
  }

  async run(cmd, msg) {
    const { chief_justice_role } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const role = msg.channel.guild.roles.get(chief_justice_role);

    if (!chief_justice_role) {
      return PreconditionResult.fromError(cmd, 'the Chief Justice role needs to be set.');
    } else if (!role) {
      return PreconditionResult.fromError(
        cmd, 'the Chief Justice role was deleted and needs to be set.'
      );
    } else if (!discord.usable_role(msg.channel.guild, role)) {
      return PreconditionResult.fromError(
        cmd, 'the Chief Justice role needs to be lower than me in hierarchy.'
      );
    } else if (!msg.member.roles.includes(chief_justice_role)) {
      return PreconditionResult.fromError(
        cmd, 'Only the Chief Justice may use this command'
      );
    }

    return PreconditionResult.fromSuccess();
  }
}();
