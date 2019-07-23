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
const { Command, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');

module.exports = new class ResignFromLawyer extends Command {
  constructor() {
    super({
      description: 'Resigns from being a lawyer.',
      groupName: 'lawyers',
      names: ['resign_from_lawyer', 'lawyer_resign', 'resign_lawyer']
    });
  }

  async run(msg) {
    const lawyer = db.get_lawyer(msg.channel.guild.id, msg.author.id, false);

    if (!lawyer || lawyer.active === 0) {
      return CommandResult.fromError('You\'re already not an active lawyer.');
    }

    db.set_inactive_lawyer(msg.channel.guild.id, msg.author.id);

    const prefix = `${discord.tag(msg.author).boldified}, `;

    return discord.create_msg(
      msg.channel, `${prefix}You have successfully resigned from being a lawyer.`
    );
  }
}();
