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
const system = require('../../utilities/system.js');
const util = require('../../utilities/util.js');

module.exports = new class SetMaxVerdict extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: '4',
          key: 'law',
          name: 'law ID',
          type: 'law'
        }),
        new Argument({
          example: '5h',
          key: 'verdict',
          name: 'verdict',
          type: 'time'
        })
      ],
      description: 'Set a max verdict.',
      groupName: 'owners',
      names: ['set_max_verdict', 'set_maximum_verdict']
    });
  }

  async run(msg, args) {
    if (args.law.min_verdict >= args.verdict && args.law.min_verdict !== null) {
      return CommandResult.fromError('You may not make the maximum verdict lower than the min.');
    }

    const time = util.get_time(args.verdict);

    db.set_max_verdict(args.verdict, args.law.id);
    await discord.create_msg(
      msg.channel, `${discord.tag(msg.author).boldified}, I have set the max verdict of law ${args.law.name} to ${time}.`
    );

    const laws = db.fetch_laws(msg.channel.guild.id).filter(x => x.active === 1);
    const { law_channel } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const channel = msg.channel.guild.channels.get(law_channel);

    return system.update_laws(channel, laws);
  }
}();
