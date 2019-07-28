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
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const number = require('../../utilities/number.js');

module.exports = new class Balance extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'steve',
          type: 'member',
          name: 'member',
          key: 'member',
          remainder: true,
          defaultValue: ArgumentDefault.Member
        })
      ],
      description: 'View a member\'s balance.',
      groupName: 'economy',
      names: ['balance', 'cash', 'money', 'bal']
    });
  }

  async run(msg, args) {
    const cash = db.get_cash(args.member.id, msg.channel.guild.id);
    const embed = discord.embed({
      title: `${discord.tag(args.member.user)}'s Balance`,
      description: `**Balance:** ${number.format(cash)}`
    });
    const c_case = db.get_channel_case(msg.channel.id);

    if (c_case && c_case.cost) {
      embed.footer = {
        text: `Your held balance in this case: ${number.format(c_case.cost, true)}`
      };
    }

    return msg.channel.createMessage(embed);
  }
}();
