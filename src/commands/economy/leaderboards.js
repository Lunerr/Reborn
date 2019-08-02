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
const { Command, CommandResult } = require('patron.js');
const { config } = require('../../services/data.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const number = require('../../utilities/number.js');
const util = require('../../utilities/util.js');

module.exports = new class Leaderboards extends Command {
  constructor() {
    super({
      description: 'View the richest members.',
      groupName: 'economy',
      names: ['leaderboards', 'lb', 'top']
    });
  }

  async run(msg) {
    const members = db
      .get_guild_members(msg.channel.guild.id)
      .filter(x => x.cash > 0)
      .sort((a, b) => b.cash - a.cash);

    if (!members.length) {
      return CommandResult.fromError('There are no members on the leaderboards.');
    }

    let desc = '';

    for (let i = 0; i < members.length; i++) {
      const member = msg.channel.guild.members.get(members[i].member_id);

      if (!member) {
        members.splice(i--, 1);
        continue;
      } else if (i + 1 > config.leaderboard) {
        break;
      }

      const cash = number.format(members[i].cash, true);
      const user = util.escape_markdown(discord.tag(member.user));

      desc += `${i + 1}. **${user}**: ${cash}\n`;
    }

    return discord.send_msg(msg, desc, 'The Richest Members', null, null, false);
  }
}();
