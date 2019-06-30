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
const { Argument, Command, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');

module.exports = new class RemoveLaw extends Command {
  constructor() {
    super({
      preconditions: ['law_channel'],
      args: [
        new Argument({
          example: 'Rule 1',
          key: 'law',
          name: 'law',
          type: 'law',
          remainder: true
        })
      ],
      description: 'Removes a law.',
      groupName: 'owners',
      names: ['remove_law', 'delete_law']
    });
  }

  async run(msg, args) {
    if (args.law.active === 0) {
      return CommandResult.fromError('This law was already removed.');
    }

    db.close_law(args.law.id);
    await discord.create_msg(
      msg.channel, `${discord.tag(msg.author).boldified}, I have removed the law ${args.law.name}.`
    );

    const laws = db.fetch_laws(msg.channel.guild.id).filter(x => x.active === 1);
    const { law_channel } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const channel = msg.channel.guild.channels.get(law_channel);

    return system.update_laws(channel, laws);
  }
}();
