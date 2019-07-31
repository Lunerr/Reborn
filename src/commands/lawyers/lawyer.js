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
const { Argument, Command, ArgumentDefault } = require('patron.js');
const { config, constants: { error_color } } = require('../../services/data.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const number = require('../../utilities/number.js');
const system = require('../../utilities/system.js');
const to_percent = 100;
const max_dec = 2;

module.exports = new class Lawyer extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'penis man',
          type: 'member',
          name: 'member',
          key: 'member',
          remainder: true,
          defaultValue: ArgumentDefault.Member
        })
      ],
      description: 'View a lawyers\'s record.',
      groupName: 'lawyers',
      names: ['lawyer']
    });
  }

  async run(msg, args) {
    const lawyer = db.get_lawyer(msg.channel.guild.id, args.member.id, false);

    if (!lawyer || lawyer.active === 0) {
      const is_self = args.member.id === msg.author.id;
      const prefix = `${discord.tag(msg.author).boldified}, `;
      const obj = discord.embed({
        description: `${prefix}${is_self ? 'You\'re' : 'This user is'} not a lawyer.`,
        color: error_color
      });

      if (is_self) {
        obj.embed.footer = {
          text: `Use the ${config.prefix}set_lawyer_rate command to become a lawyer.`
        };
      }

      return msg.channel.createMessage(obj);
    }

    const record = system.get_win_percent(args.member.id, msg.channel.guild);
    const formatted_rate = number.format(lawyer.rate, true);
    const title = `${discord.tag(args.member.user)}'s Lawyer Profile`;
    const embed = discord.embed({
      title, description: `**Wins**: ${record.wins}\n**Losses:** ${record.losses}
**Win Percent:** ${(record.win_percent * to_percent).toFixed(max_dec)}%\n**Rate:** \
${formatted_rate} per case`
    });

    return msg.channel.createMessage(embed);
  }
}();
