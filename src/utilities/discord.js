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
const { CommandResult } = require('patron.js');
const catch_discord = require('./catch_discord.js');
const client = require('../services/client.js');
const { config, constants } = require('../services/data.js');
const msg_collector = require('../services/message_collector.js');
const util = require('../utilities/util.js');
const db = require('../services/database.js');
const create_message = catch_discord((...args) => client.createMessage(...args));
const fetch = require('node-fetch');
const max_fetch = 100;
const rl = 4;

module.exports = {
  get_main_channel(guild_id) {
    const channels = db
      .fetch_channels(guild_id)
      .filter(x => x.active === 1);
    let channel = null;

    for (let i = 0; i < channels.length; i++) {
      const guild = client.guilds.get(client.channelGuildMap[channels[i].channel_id]);
      const guild_channel = guild.channels.get(channels[i].channel_id);

      if (!guild_channel) {
        continue;
      }

      const name = guild_channel.name.toLowerCase();

      if (name.includes('main') || name.includes('general')) {
        channel = guild_channel;
        break;
      }

      channel = guild_channel;
    }

    return channel;
  },

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

  async dm_fallback(user, content, guild = {}) {
    const res = await this.dm(user, content, guild);

    if (res) {
      return true;
    }

    const main_channel = this.get_main_channel(guild.id);

    if (!main_channel) {
      return false;
    }

    try {
      const mem = guild.members.get(user.id) || user;

      await main_channel.createMessage(`${mem.mention}, ${content}`);

      return true;
    } catch (_) {
      return false;
    }
  },

  is_online(mem) {
    return mem.status === 'online' || mem.status === 'dnd';
  },

  async fetch_msgs(channel, limit = null) {
    const msgs = [];
    let count = 0;
    let fetched;
    let last;

    const on_err = async l => {
      await util.delay();

      return channel.getMessages(max_fetch, l);
    };

    /* eslint-disable no-loop-func */
    while (
      (fetched = await channel.getMessages(max_fetch, last).catch(() => on_err(last))).length
    ) {
      msgs.push(...fetched);

      if (limit !== null && msgs.length >= limit) {
        break;
      }

      last = fetched[fetched.length - 1].id;
      count++;

      if (count % rl === 0) {
        await util.delay();
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

  sanitize_mentions(content) {
    return content.replace(/@(everyone|here|(!|&)?\d{17,19})/g, '@\u200b$1');
  },

  async verify(msg, content) {
    const verified = await this.verify_msg(
      msg, `${this.tag(msg.author).boldified}, ${content}`, null, 'yes'
    );

    if (!verified) {
      return CommandResult.fromError('The command has been cancelled.');
    }

    return { success: true };
  },

  async get_infinite_invite(guild) {
    const invites = await guild.getInvites();
    const inf_invite = invites.find(
      x => x.inviter
        && x.inviter.id === client.user.id
        && x.maxAge === 0 && x.maxUses === 0
    );

    if (inf_invite) {
      return inf_invite;
    }

    let main_channel = this.get_main_channel(guild.id);

    if (!main_channel) {
      main_channel = guild.channels.find(x => x.type === 0);

      if (!main_channel) {
        return null;
      }
    }

    return main_channel.createInvite({
      maxAge: 0,
      maxUses: 0,
      temporary: false
    });
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
