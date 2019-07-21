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
const { Argument, Command } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const number = require('../../utilities/number.js');
const min_rate = 0;

module.exports = new class SetLawyerWage extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: '100',
          key: 'rate',
          name: 'rate',
          type: 'amount',
          preconditions: ['min'],
          preconditionOptions: [{ minimum: min_rate }],
          remainder: true
        })
      ],
      description: 'Sets your rate per case.',
      groupName: 'general',
      names: ['set_lawyer_wage', 'set_lawyer_rate', 'set_wage', 'set_rate']
    });
  }

  async run(msg, args) {
    db.set_rate(msg.channel.guild.id, msg.author.id, args.rate);

    const prefix = `${discord.tag(msg.author).boldified}, `;

    return discord.create_msg(
      msg.channel, `${prefix}You have set your rate to ${number.format(args.rate)} per case.`
    );
  }
}();
