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

module.exports = new class ModifyCash extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          name: 'amount',
          key: 'amount',
          type: 'amount',
          example: '1k'
        }),
        new Argument({
          name: 'user',
          key: 'user',
          type: 'user',
          example: 'HornyDevil',
          remainder: true,
          defaultValue: ArgumentDefault.Author
        })
      ],
      preconditions: ['guild_db_exists'],
      description: 'Modifies a users balance.',
      groupName: 'owners',
      names: [
        'modify_cash',
        'mod_cash',
        'mod_bal',
        'modify_bal',
        'modify_balance'
      ]
    });
  }

  async run(msg, args) {
    db.set_cash(args.user.id, msg.channel.guild.id, args.amount);

    const prefix = `${discord.tag(msg.author).boldified}, `;
    const str = discord.get_tag_or_self(msg.author, args.user);

    await discord.create_msg(
      msg.channel,
      `${prefix}You have successfully set ${str} balance to ${number.format(args.amount)}.`
    );
  }
}();
