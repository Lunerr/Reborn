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
const { Command, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const system = require('../../utilities/system.js');
const discord = require('../../utilities/discord.js');
const max_warrants = 25;

module.exports = new class Detainments extends Command {
  constructor() {
    super({
      description: 'View the current detainment.',
      groupName: 'general',
      names: ['detainments', 'requests']
    });
  }

  async run(msg) {
    const warrants = db
      .fetch_warrants(msg.channel.guild.id)
      .filter(x => x.executed === 0 && x.request === 1)
      .sort((a, b) => a.created_at - b.created_at);

    if (!warrants.length) {
      return CommandResult.fromError('There are no active detainments.');
    }

    await this.send_warrants(msg, warrants);
  }

  async send_warrants(msg, warrants) {
    const top = warrants.slice(0, max_warrants);
    const obj = discord.embed({ fields: [] });

    for (let i = 0; i < top.length; i++) {
      const message = await system.format_warrant(
        msg.channel.guild, top[i], top[i].id, top[i].executed
      );

      obj.embed.fields.push({
        name: '\u200b', value: message, inline: false
      });
    }

    return msg.channel.createMessage(obj);
  }
}();
