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
const discord = require('../utilities/discord.js');
const db = require('../services/database.js');
const util = require('../utilities/util.js');
const link = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
const emoji = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
const mentions = /@(everyone|here)|(<@(!|#|&)?(\d{17,19})>)/g;

module.exports = {
  messages: {},
  giveaway_entries: {},
  court_messages: {},
  mutex: new MultiMutex(),

  prune(content) {
    return util.escape_markdown(content
      .replace(link, '')
      .replace(emoji, '')
      .replace(mentions, ''));
  },

  async add_court_messages(msg) {
    const key = `${msg.channel.guild.id}-${msg.channel.id}`;

    return this.mutex.sync(key, async () => {
      const now = Date.now();
      const channel_case = db.get_channel_case(msg.channel.id);

      if (channel_case) {
        const last_message = this.court_messages[key];
        const cooldown = !last_message || last_message.started + 6e4 > now;
        const send_message = !last_message || last_message.senders.length >= 2 && last_message.count >= 10;

        if (last_message && !last_message.sent) {
          if (send_message) {
            this.court_messages[key].sent = true;

            return discord.create_msg(discord.get_main_channel(msg.channel.guild.id), `FIRE CASE IN ${msg.channel.mention} BOIS!`);
          }

          if (last_message.senders.find(x => x === msg.author.id) === undefined) {
            this.court_messages[key].senders.push(msg.author.id);
          }

          if (cooldown && !send_message) {
            this.court_messages[key].senders.push(msg.author.id);
            this.court_messages[key].count += 1;
          }
        } else {
          this.court_messages[key] = {
            senders: [msg.author.id],
            sent: false,
            started: now,
            count: 1
          };
        }
      }
    });
  },

  async add_giveaway_entry(msg) {
    const key = `${msg.author.id}-${msg.channel.guild.id}`;

    return this.mutex.sync(key, async () => {
      const now = Date.now();
      const last_message = this.giveaway_entries[key];
      const cooldown = config.msg_giveaway_cooldown;
      const cd_over = !last_message || now - last_message.time > cooldown;
      const long_enough = this.prune(msg.content).length >= config.min_msg_length;
      const not_max_entries = !last_message || last_message.count < 90;
      const guild = db.fetch('guilds', { guild_id: msg.channel.guild.id });
      const active_giveaway = guild.giveaway_timer > 0;

      if (!active_giveaway && Object.keys(this.giveaway_entries).length > 0) {
        this.giveaway_entries = {};
      }

      if (cd_over && long_enough && not_max_entries && active_giveaway) {
        if (last_message) {
          this.giveaway_entries[key].count += 1;
          this.giveaway_entries[key].time = now;
        } else {
          this.giveaway_entries[key] = {
            count: 1,
            author: msg.author.id,
            time: now
          };
        }
      }
    });
  },

  async add_cash(msg) {
    const key = `${msg.author.id}-${msg.channel.guild.id}`;

    return this.mutex.sync(key, async () => {
      const now = Date.now();
      const last_message = this.messages[key];
      const cooldown = config.msg_cooldown;
      const cd_over = !last_message || now - last_message.time > cooldown;
      const long_enough = this.prune(msg.content).length >= config.min_msg_length;

      if (cd_over && long_enough) {
        if (last_message) {
          this.messages[key].ids.push(msg.id);
          this.messages[key].time = now;
        } else {
          this.messages[key] = {
            ids: [msg.id],
            time: now
          };
        }

        const amount = this.get_cpm(msg.channel.guild.id, msg.member);

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

