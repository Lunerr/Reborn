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

module.exports = new class AddLaw extends Command {
  constructor() {
    super({
      preconditions: ['guild_db_exists'],
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
          example: '24h',
          key: 'length',
          name: 'max mute length',
          type: 'time_span',
          defaultValue: 86400000
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
    const existingLaw = db
      .fetch_laws(msg.channel.guild.id)
      .some(x => x.name.toLowerCase() === args.name.toLowerCase() && x.active === 1);

    if (existingLaw) {
      return CommandResult.fromError('An active law by this name already exists.');
    }

    db.insert('laws', {
      guild_id: msg.channel.guild.id,
      name: args.name,
      content: args.content,
      max_mute_len: args.length,
      mandatory_felony: args.mandatory ? 1 : 0
    });
    await discord.create_msg(
      msg.channel,
      `**${discord.tag(msg.author)}**, I have created the law ${args.name}.`
    );
  }
}();
