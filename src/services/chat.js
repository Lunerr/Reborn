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
const { MultiMutex } = require('patron.js');
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const util = require('../utilities/util.js');
const link = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
const emoji = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
const mentions = /@(everyone|here)|(<@(!|#|&)?(\d{17,19})>)/g;

module.exports = {
  messages: {},
  mutex: new MultiMutex(),

  prune(content) {
    return util.escape_markdown(content
      .replace(link, '')
      .replace(emoji, '')
      .replace(mentions, ''));
  },

  async add_cash(msg) {
    const key = `${msg.author.id}-${msg.channel.guild.id}`;

    return this.mutex.sync(key, async () => {
      const now = Date.now();
      const lastMessage = this.messages[key];
      const cooldown = config.msg_cooldown;
      const cdOver = !lastMessage || now - lastMessage.time > cooldown;
      const longEnough = this.prune(msg.content).length >= config.min_msg_length;

      if (cdOver && longEnough) {
        if (lastMessage) {
          this.messages[key].ids.push(msg.id);
          this.messages[key].time = now;
        } else {
          this.messages[key] = {
            ids: [msg.id],
            time: now
          };
        }

        const amount = this.get_cpm(msg.channel.guild, msg.member);

        return db.add_cash(msg.author.id, msg.channel.guild.id, amount);
      }
    });
  },

  get_cpm(guild_id, member) {
    const { house_speaker_role, congress_role } = db.fetch('guilds', { guild_id });
    let amount = config.cash_per_msg;

    if (member.roles.includes(house_speaker_role) || member.roles.includes(congress_role)) {
      amount *= config.congress_cpm_multiplier;
    }

    return amount;
  }
};

