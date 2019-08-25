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
const chat = require('../../services/chat.js');
const client = require('../../services/client.js');
const discord = require('../../utilities/discord.js');

module.exports = new class NitroGiveawayLeaderboard extends Command {
  constructor() {
    super({
      description: 'View the nitro giveaway leaderboard.',
      groupName: 'general',
      names: ['nitro_lottery_leaderboard', 'nitro_giveaway_leaderboard', 'nitro_leaderboard', 'giveaway_leaderboard']
    });
  }

  async run(msg) {
    let message = '';
    const entries = Object.values(chat.giveaway_entries);

    for (let i = 0; i < entries.length; i++) {
      const author = await client.users.get(entries[i].author);

      message += `${discord.tag(author).boldified}: ${entries[i].count}\n`;
    }

    return discord.send_msg(msg, message, 'Giveaway Entries', null, null, false);
  }
}();
