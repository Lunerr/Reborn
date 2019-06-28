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
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const max_warrants = 25;
const max_embed_char = 6e3;

module.exports = new class Warrants extends Command {
  constructor() {
    super({
      description: 'View the current active warrants.',
      groupName: 'general',
      names: ['warrants']
    });
  }

  async run(msg) {
    const warrants = db
      .fetch_warrants(msg.channel.guild.id)
      .filter(x => x.executed === 0)
      .sort((a, b) => a.created_at - b.created_at);

    if (!warrants.length) {
      return CommandResult.fromError('There are no active warrants.');
    }

    await this.send_warrants(msg, warrants);
  }

  async send_warrants(msg, warrants) {
    const top = warrants.slice(0, max_warrants);
    let obj = discord.embed({
      title: 'Warrants', fields: []
    });
    let total_count = 0;
    const zws = '\u200b';

    for (let i = 0; i < top.length; i++) {
      const message = await system.format_warrant(
        msg.channel.guild, top[i], top[i].id, top[i].executed
      );

      if (total_count + message.length + zws.length >= max_embed_char) {
        await msg.channel.createMessage(obj);
        obj = discord.embed({
          title: 'Warrants', fields: [
            {
              name: zws, value: message, inline: false
            }
          ]
        });
      } else {
        obj.embed.fields.push({
          name: zws, value: message, inline: false
        });
        total_count += message.length + zws.length;
      }
    }

    if (obj.embed.fields.length) {
      return msg.channel.createMessage(obj);
    }
  }
}();
