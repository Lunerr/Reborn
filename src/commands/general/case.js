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

module.exports = new class Case extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: '2',
          type: 'int',
          name: 'id',
          key: 'id'
        })
      ],
      description: 'View a court case.',
      groupName: 'general',
      names: ['case']
    });
  }

  async run(msg, args) {
    const cases = db.fetch_cases(msg.channel.guild.id);
    const c_case = cases.find(x => x.id === args.id);

    if (!c_case) {
      return CommandResult.fromError('This court case does not exist.');
    }

    const info = await system.format_case(msg.channel.guild, c_case);
    const embed = discord.embed({
      title: `Case ${c_case.id}`, description: info
    });

    return msg.channel.createMessage(embed);
  }
}();
