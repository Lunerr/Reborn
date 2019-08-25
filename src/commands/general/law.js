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
const system = require('../../utilities/system.js');
const db = require('../../services/database.js');

module.exports = new class Law extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'cp',
          type: 'int',
          name: 'law ID',
          key: 'law'
        })
      ],
      description: 'View a law.',
      groupName: 'general',
      names: ['law']
    });
  }

  async run(msg, args) {
    const law = db.fetch_laws(msg.channel.guild.id).find(x => x.id === args.law);

    if (!law) {
      return CommandResult.fromError('This law does not exist.');
    }

    const [formatted_law] = system.format_laws([law]);

    return msg.channel.createMessage({ embed: formatted_law });
  }
}();
