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
const { Argument, Command, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const empty_argument = Symbol('Empty Argument');
const max_len = 500;
const min_len = 4;

module.exports = new class AddHot extends Command {
  constructor() {
    super({
      preconditions: ['guild_db_exists', 'max_custom_cmds'],
      args: [
        new Argument({
          example: '"johns"',
          key: 'name',
          name: 'name',
          type: 'string',
          preconditions: ['conflicting_cmd', 'alphanumeric']
        }),
        new Argument({
          example: 'genitals are microscopic',
          key: 'response',
          name: 'response',
          type: 'string',
          defaultValue: empty_argument,
          remainder: true
        })
      ],
      description: 'Adds a custom command.',
      groupName: 'congress',
      names: ['add_hot', 'create_hot', 'add_hot']
    });
  }

  async run(msg, args) {
    if (!args.name.trim()) {
      return CommandResult.fromError('The name cannot be empty.');
    } else if (args.name.length < min_len) {
      return CommandResult.fromError(`The minimum length of the name is ${min_len} characters.`);
    }

    const cmds = db.fetch_commands(msg.channel.guild.id);
    const lower = args.name.toLowerCase();
    const { attachments } = msg;

    if (cmds.some(x => x.name.toLowerCase() === lower && x.active === 1)) {
      return CommandResult.fromError('A custom command by this name already exists.');
    } else if (!attachments.length && args.response === empty_argument) {
      return CommandResult.fromError('A custom command must at least have a response or image.');
    }

    const update = {
      guild_id: msg.channel.guild.id,
      creator_id: msg.author.id,
      name: args.name
    };

    if (args.response !== empty_argument) {
      if (args.response.length > max_len) {
        return CommandResult.fromError(
          `The maximum length of the response can't be greater than ${max_len} characters.`
        );
      }

      update.response = discord.sanitize_mentions(args.response);
    }

    if (attachments.length) {
      update.image = attachments[0].proxy_url;
    }

    db.insert('commands', update);
    await discord.create_msg(
      msg.channel, `${discord.tag(msg.author).boldified}, \
I've created a custom command with the name ${args.name}.`
    );
  }
}();
