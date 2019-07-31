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
const { config, constants } = require('../services/data.js');
const catch_discord = require('./catch_discord.js');
const client = require('../services/client.js');
const msg_collector = require('../services/message_collector.js');
const util = require('../utilities/util.js');
const str = require('../utilities/string.js');
const db = require('../services/database.js');
const handler = require('../services/handler.js');
const create_message = catch_discord((...args) => client.createMessage(...args));
const fetch = require('node-fetch');
const max_fetch = 100;
const bulk_del_time = 12e8;
const rl = 4;

module.exports = {
  async delete_msgs(channel, msgs, reason) {
    const now = Date.now();
    const bulk_del = msgs.filter(x => now - x.timestamp < bulk_del_time);
    const single_del = msgs.filter(x => !bulk_del.some(c => c.id === x.id));
    const chunked = util.chunk(bulk_del.map(x => x.id), max_fetch);

    for (let i = 0; i < chunked.length; i++) {
      await channel.deleteMessages(chunked[i]).catch(() => null);

      if (i % rl === 0) {
        await util.delay();
      }
    }

    for (let i = 0; i < single_del.length; i++) {
      await channel.deleteMessage(single_del[i].id, reason).catch(() => null);

      if (i % rl === 0) {
        await util.delay();
      }
    }

    return {
      bulk_del, single_del
    };
  },

  get_tag_or_self(author, person) {
    return author.id === person.id ? 'your' : `${this.tag(person).boldified}`;
  },

  async loop_guilds(fn) {
    const guilds = [...client.guilds.keys()];

    for (let i = 0; i < guilds.length; i++) {
      const guild = client.guilds.get(guilds[i]);

      await fn(guild, guilds[i], i);
    }
  },

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

  async verify(msg, content) {
    const verified = await this.verify_msg(
      msg, `${this.tag(msg.author).boldified}, ${content}`, null, 'yes'
    );
    const cancelled = verified.reply && verified.reply.content.toLowerCase() === 'cancel';

    if (verified.conflicting) {
      return CommandResult.fromError('The previous interactive command was cancelled.');
    } else if (!verified.success || cancelled) {
      return CommandResult.fromError('The command has been cancelled.');
    }

    return { success: true };
  },

  async verify_msg(msg, content, file, verify = 'I\'m sure') {
    const lower = verify.toLowerCase();
    const fn = m => m.author.id === msg.author.id && m.content.toLowerCase() === lower;
    const res = await this
      .verify_channel_msg(msg, msg.channel, content, file, fn)
      .then(x => x.promise);

    return res;
  },

  async verify_channel_msg(msg, channel, content, file, fn, key_append = '', time) {
    let resolve;
    let cancelled;

    const wrap_with_cancel = func => (...data) => {
      if (!cancelled) {
        return func(...data);
      }
    };
    const promise = new Promise(r => {
      resolve = r;
    });
    const obj = {
      promise,
      cancel: () => {
        cancelled = true;
        resolve({
          success: false, conflicting: true
        });
      }
    };
    const key = `${msg.author.id}-${msg.channel.guild.id}${key_append ? `-${key_append}` : ''}`;
    const cmd = await handler.parseCommand(msg, config.prefix.length);
    let cmd_name = '';

    if (cmd.success) {
      [cmd_name] = cmd.command.names;
    }

    Promise.resolve()
      .then(() => {
        if (content) {
          return wrap_with_cancel(this.create_msg.bind(this))(channel, content, null, file);
        }

        return {};
      })
      .then(() => wrap_with_cancel(this._timeout_promise)(
        fn, key, key_append, channel.id, cmd_name, obj, time
      ))
      .then(resolve);

    return obj;
  },

  _timeout_promise(fn, key, key_append, channel_id, cmd_name, obj, time) {
    return new Promise(async res => {
      const timeout = setTimeout(() => {
        msg_collector.remove(key);
        res({ success: false });
      }, time ? time : config.verify_timeout);

      msg_collector.add(
        m => m.channel.id === channel_id && fn(m), reply => {
          clearTimeout(timeout);
          res({
            success: true, reply
          });
        }, key, key_append, cmd_name, obj
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

  valid_role(res, roles, guild) {
    for (let i = 0; i < roles.length; i++) {
      const id = res[roles[i]];
      const g_role = guild.roles.get(id);
      const name = roles[i].split('_').slice(0, -1).map(str.to_uppercase);

      if (!id || !g_role) {
        return {
          success: false,
          reason: `The ${name.join(' ')} role needs to be set.`
        };
      } else if (!this.usable_role(guild, g_role)) {
        return {
          success: false,
          reason: `The ${name.join(' ')} role is higher in hierarchy than me.`
        };
      }
    }

    return {
      success: true
    };
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
