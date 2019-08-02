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
const { Command } = require('patron.js');
const { config } = require('../../services/data.js');
const system = require('../../utilities/system.js');
const number = require('../../utilities/number.js');
const discord = require('../../utilities/discord.js');

module.exports = new class LegalFees extends Command {
  constructor() {
    super({
      description: 'View the legal fees covered by the governemnt.',
      groupName: 'general',
      names: ['legal_fees']
    });
  }

  async run(msg) {
    const amount = system.large_sum_of_money(msg.channel.guild, config.max_money_percent);
    const format = number.format(amount, true);

    return discord.send_msg(msg, `The government will cover up to ${format} \
in legal fees in the event of an automatically picked attorney.`);
  }
}();
