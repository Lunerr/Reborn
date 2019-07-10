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
const { Argument, Command } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');

module.exports = new class SetCourtCategory extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: '357419754358571011',
          key: 'channel',
          name: 'channel',
          type: 'categorychannel',
          preconditions: ['usable_channel'],
          remainder: true
        })
      ],
      description: 'Sets the Court category.',
      groupName: 'owners',
      names: ['set_court_category', 'set_court']
    });
  }

  async run(msg, args) {
    db.update('guilds', {
      guild_id: msg.channel.guild.id,
      court_category: args.channel.id
    });
    await discord.create_msg(
      msg.channel,
      `${discord.tag(msg.author).boldified}, I have set the Court category to ${args.channel.name}.`
    );
  }
}();
