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
const { Command, Context } = require('patron.js');
const verdict = require('../../enums/verdict.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const chat = require('../../services/chat.js');
const number = require('../../utilities/number.js');
const client = require('../../services/client.js');
const ONE_HOUR = 3.6e+6;

module.exports = new class Statistics extends Command {
  constructor() {
    super({
      usableContexts: [Context.DM, Context.Guild],
      description: 'Shows statistics on the bot.',
      groupName: 'system',
      names: ['statistics', 'stats', 'stat']
    });
  }

  async run(msg) {
    const uptime = number.msToTime(client.uptime);
    const formatted_uptime = `Days: ${uptime.days}
                                Hours: ${uptime.hours}
                                Minutes: ${uptime.minutes}`;
    let users = 0;
    let online_users = 0;
    let subscriptions = 0;
    let tier = 0;

    for (const guild of client.guilds.values()) {
      users += guild.memberCount;
      subscriptions += guild.premiumSubscriptionCount;
      tier += guild.premiumTier;
      online_users += guild.members.filter(x => x.status === 'online').length;
    }

    const messages = Object.values(chat.messages).filter(x => x.time >= Date.now() - ONE_HOUR);

    console.log(uptime);
    await discord.create_msg(msg.channel, `You've been DMed the statistics of ${client.user.username}.`);

    return discord.dm_fields_message(msg.author, [
      'Member Count',
      users,
      'Online Members',
      online_users,
      'Premium Tier',
      tier,
      'Users Boosting',
      subscriptions,
      'Chat Count In Last Hour',
      messages.length,
      'Uptime',
      formatted_uptime
    ]);
  }
}();
