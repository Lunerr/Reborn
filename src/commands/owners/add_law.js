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

module.exports = new class AddLaw extends Command {
  constructor() {
    super({
      preconditions: ['guild_db_exists', 'law_channel'],
      args: [
        new Argument({
          example: '"Rule 1"',
          key: 'name',
          name: 'name',
          type: 'string'
        }),
        new Argument({
          example: '"The people have the right to bear arms!"',
          key: 'content',
          name: 'content',
          type: 'string'
        }),
        new Argument({
          example: 'yes',
          key: 'mandatory',
          name: 'mandatory felony',
          type: 'bool',
          defaultValue: false
        })
      ],
      description: 'Adds a law.',
      groupName: 'owners',
      names: ['add_law']
    });
  }

  async run(msg, args) {
    const name = args.name.toLowerCase();
    const laws = db.fetch_laws(msg.channel.guild.id);
    const existingLaw = laws.some(x => x.name.toLowerCase() === name && x.active === 1);

    if (existingLaw) {
      return CommandResult.fromError('An active law by this name already exists.');
    }

    const law = {
      guild_id: msg.channel.guild.id,
      name: args.name,
      content: args.content,
      mandatory_felony: args.mandatory ? 1 : 0
    };

    db.insert('laws', law);
    await discord.create_msg(
      msg.channel, `${discord.tag(msg.author).boldified}, I have created the law ${args.name}.`
    );

    const { law_channel } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const channel = msg.channel.guild.channels.get(law_channel);

    return system.add_law(channel, law);
  }
}();
