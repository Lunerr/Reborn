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
const discord = require('../../utilities/discord.js');
const str = require('../../utilities/string.js');
const plea = require('../../enums/plea.js');
const db = require('../../services/database.js');
const empty_argument = Symbol('Empty Argument');

module.exports = new class Plea extends Command {
  constructor() {
    super({
      preconditions: ['court_only', 'court_case', 'lawyer_set', 'lawyer_only'],
      args: [
        new Argument({
          example: 'guilty',
          key: 'plea',
          name: 'plea',
          type: 'string',
          remainder: true,
          defaultValue: empty_argument
        })
      ],
      description: 'Sets the plea for the defendant of a court case.',
      groupName: 'courts',
      names: ['plea']
    });
  }

  async run(msg, args) {
    const channel_case = db.get_channel_case(msg.channel.id);
    const keys = Object.keys(plea);
    const prefix = `${discord.tag(msg.author).boldified}, `;

    if (channel_case.plea !== null) {
      const found_plea = keys.find(x => plea[x] === channel_case.plea);

      if (args.plea === empty_argument) {
        return discord.create_msg(msg.channel, `${prefix}The plea is \`${found_plea}\`.`);
      }
    }

    const lower = (args.plea === empty_argument ? '' : args.plea).toLowerCase();
    const found = keys.find(x => x === lower);

    if (!found) {
      const list = str.list(keys, 'or');

      return CommandResult.fromError(
        `You have provided an invalid plea. The plea must be one of: \`${list}\`.`
      );
    }

    const found_plea = plea[lower];
    const original = keys.find(x => plea[x] === found_plea);

    db.set_case_plea(channel_case.id, found_plea);

    return discord.create_msg(msg.channel, `${prefix}The plea has been set to \`${original}\`.`);
  }
}();
