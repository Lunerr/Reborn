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
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const link = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
const emoji = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
const mentions = /@(everyone|here)|(<@(!|#|&)?(\d{17,19})>)/g;

module.exports = {
  messages: {},

  prune(content) {
    return content
      .replace(link, '')
      .replace(emoji, '')
      .replace(mentions, '');
  },

  async add_cash(msg) {
    const key = `${msg.author.id}-${msg.channel.guild.id}`;
    const lastMessage = this.messages[key];
    const cooldown = config.msg_cooldown;
    const cdOver = !lastMessage || Date.now() - lastMessage > cooldown;
    const longEnough = this.prune(msg.content).length >= config.min_msg_length;

    if (cdOver && longEnough) {
      if (!lastMessage) {
        db.get_member(msg.author.id, msg.channel.guild.id);
      }

      const amount = config.cash_per_msg;

      this.messages[key] = Date.now();

      return db.add_cash(msg.author.id, msg.channel.guild.id, amount);
    }
  }
};

