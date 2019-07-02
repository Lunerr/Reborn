/**
 * Reborn - The core control of the only truly free and fair discord server.
 * Copyright (C) 2019  John Boyer
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
const catch_discord = require('./catch_discord.js');
const client = require('../services/client.js');
const { config, constants } = require('../services/data.js');
const msg_collector = require('../services/message_collector.js');
const create_message = catch_discord((...args) => client.createMessage(...args));
const fetch = require('node-fetch');
const delay = 2e3;
const max_fetch = 100;
const rl = 5;

module.exports = {
  async dm(user, content, guild = {}) {
    try {
      const dm = await user.getDMChannel();

      await dm.createMessage(this.embed({
        description: content,
        footer: {
          text: guild.name,
          icon_url: guild.iconURL
        }
      }));

      return true;
    } catch (_) {
      return false;
    }
  },

  async fetch_msgs(channel) {
    const msgs = [];
    let count = 0;
    let fetched;
    let last;

    while ((fetched = await channel.getMessages(max_fetch, last)).length) {
      msgs.push(...fetched);
      last = fetched[fetched.length - 1].id;
      count++;

      if (count % rl === 0) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    return msgs;
  },
  embed(options) {
    if (!options.color) {
      options.color = constants
        .default_colors[Math.floor(Math.random() * constants.default_colors.length)];
    }

    return { embed: options };
  },

  resolve_image_link(link) {
    return fetch(link).then(x => x.buffer());
  },

  create_msg(channel, msg, color, file) {
    let result;

    if (typeof msg === 'string') {
      result = this.embed({
        color,
        description: msg
      });
    } else {
      result = this.embed({
        color,
        ...msg
      });
    }

    return create_message(channel.id, result, file);
  },

  sanitize_mentions(msg, content) {
    return msg.mentions
      .map(x => x.id)
      .concat(msg.roleMentions)
      .reduce(
        (a, b) => a.replace(b, `\u200b${b}`), content.replace(/@(everyone|here)/g, '@\u200b$1')
      );
  },

  async verify_msg(msg, content, file, verify = 'I\'m sure') {
    const lower = verify.toLowerCase();
    const fn = m => m.author.id === msg.author.id && m.content.toLowerCase() === lower;
    const res = await this.verify_channel_msg(msg, msg.channel, content, file, fn);

    return res.success;
  },

  verify_channel_msg(msg, channel, content, file, fn) {
    return new Promise(async res => {
      await this.create_msg(channel, content, null, file);

      const timeout = setTimeout(() => {
        msg_collector.remove(msg.id);
        res({ success: false });
      }, config.verify_timeout);

      msg_collector.add(
        m => fn(m),
        reply => {
          clearTimeout(timeout);
          res({
            success: true, reply
          });
        },
        msg.id
      );
    });
  },

  tag(user) {
    return `${user.username}#${user.discriminator}`;
  },

  formatUsername(username) {
    return username.replace(/ +/gi, '_').replace(/[^A-Z0-9_]+/gi, '');
  },

  fetch_user(id) {
    const user = client.users.get(id);

    if (!client.options.restMode || user) {
      return user;
    }

    return client.getRESTUser(id).catch(err => {
      if (err.code !== constants.discord_err_codes.unknown_user) {
        throw err;
      }
    });
  },

  usable_role(guild, role) {
    const member = guild.members.get(client.user.id);

    return member.permission.has('manageRoles') && this.hierarchy(member) > role.position;
  },

  hierarchy(member) {
    if (member.guild.ownerID === member.id) {
      return Number.MAX_SAFE_INTEGER;
    }

    let highest = 0;

    for (let i = 0; i < member.roles.length; i++) {
      const role = member.guild.roles.get(member.roles[i]);

      if (role.position > highest) {
        highest = role.position;
      }
    }

    return highest;
  }
};
