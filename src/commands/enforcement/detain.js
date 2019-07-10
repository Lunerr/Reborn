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
const { Argument, Command, CommandResult, MultiMutex } = require('patron.js');
const { config } = require('../../services/data.js');
const db = require('../../services/database.js');
const catch_discord = require('../../utilities/catch_discord.js');
const client = require('../../services/client.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const add_role = catch_discord(client.addGuildMemberRole.bind(client));
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const max_evidence = 10;
const fetch_limit = 100;
const min_judges = 2;
const recent = 3e5;

module.exports = new class Detain extends Command {
  constructor() {
    super({
      preconditions: ['can_jail', 'usable_court', 'usable_gov_role'],
      preconditionOptions: [{}, {}, { roles: ['officer_role', 'judge_role'] }],
      args: [
        new Argument({
          example: 'Serena',
          key: 'user',
          name: 'user',
          type: 'user',
          preconditions: ['no_bot'],
          remainder: true
        })
      ],
      description: 'Detain a citizen.',
      groupName: 'enforcement',
      names: ['detain']
    });
    this.bitfield = 2048;
    this.mutex = new MultiMutex();
    this.running = {};
  }

  async run(msg, args) {
    if (args.user.id === msg.author.id) {
      return CommandResult.fromError('You may not detain yourself.');
    }

    const key = `${msg.channel.guild.id}-${msg.author.id}-${args.user.id}`;

    if (this.running[key]) {
      return;
    }

    return this.mutex.sync(key, async () => {
      this.running[key] = true;

      const { jailed_role } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
      const member = msg.channel.guild.members.get(args.user.id);

      if (member) {
        await add_role(msg.channel.guild.id, args.user.id, jailed_role);
      }

      const filtered = await this.prerequisites(msg, args.user, jailed_role);

      if (filtered instanceof CommandResult) {
        this.running[key] = false;

        return filtered;
      }

      const res = await this.verify(msg, msg.member, `What law did ${args.user.mention} break?\n
Type \`cancel\` to cancel the command.`, args.user, filtered);

      this.running[key] = false;

      if (res instanceof CommandResult) {
        if (member) {
          await remove_role(msg.channel.guild.id, args.user.id, jailed_role);
        }

        return res;
      }
    });
  }

  async prerequisites(msg, user, jailed_role) {
    const msgs = await msg.channel.getMessages(fetch_limit);
    const filtered = msgs.filter(x => x && x.author.id === user.id).slice(0, max_evidence);
    let remove = true;
    let res = filtered;

    if (!filtered.length) {
      remove = true;
      res = CommandResult.fromError(`There were no recent messages sent \
by ${user.mention}.`);
    } else if (Date.now() - filtered[0].timestamp > recent) {
      remove = true;
      res = CommandResult.fromError(`The most recent message sent by ${user.mention} is \
older than 5 minutes, consider getting a judge to grant a warrant for this user.`);
    }

    if (remove) {
      await remove_role(msg.channel.guild.id, user.id, jailed_role);
    }

    return res;
  }

  async verify(msg, member, content, to_detain, fetched) {
    const res = await discord.verify_channel_msg(
      msg,
      msg.channel,
      content,
      null,
      x => x.author.id === member.id
    );

    if (res.success && res.reply.content.toLowerCase() === 'cancel') {
      return CommandResult.fromError('The command has been cancelled.');
    } else if (!res.success) {
      return CommandResult.fromError('The command has been timed out.');
    }

    const laws = db.fetch_laws(msg.channel.guild.id);
    const reply = res.reply.content.toLowerCase();
    const law = laws.find(x => x.name.toLowerCase() === reply);

    if (law) {
      return this.detain(msg, to_detain, law, fetched);
    }

    const new_content = `This law does not exist, please try again.\n
Type \`cancel\` to cancel the command.`;

    return this.verify(msg, member, new_content, to_detain, fetched);
  }

  async detain(msg, member, law, fetched) {
    const evidence = fetched
      .map((x, i) => {
        let message = `${fetched.length - i}. ${x.content} `;

        if (x.attachments.length) {
          message += x.attachments.map(c => `<${c.proxy_url}>`).join(', ');
        }

        return message;
      })
      .reverse()
      .join('\n')
      .trim();
    const {
      warrant_channel, judge_role, chief_justice_role
    } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const online = this.get_judges(msg.channel.guild, judge_role, chief_justice_role);
    const warrant = {
      guild_id: msg.channel.guild.id,
      law_id: law.id,
      defendant_id: member.id,
      officer_id: msg.author.id,
      evidence: `\n${discord.sanitize_mentions(msg, evidence)}`,
      request: 1,
      extended_time: online < min_judges ? 1 : 0
    };
    const { lastInsertRowid: id } = db.insert('warrants', warrant);

    warrant.id = id;
    await discord.create_msg(
      msg.channel, `You have successfully detained ${member.mention} and a warrant has been \
created under the law ${law.name}.\n\nA judge must approve this detainment by using \
\`${config.prefix}approve ${id}\` within ${online < min_judges ? '12 hours' : '5 minutes'} \
or else you will get impeached.`
    );

    const w_channel = msg.channel.guild.channels.get(warrant_channel);

    if (w_channel) {
      await system.add_warrant(w_channel, warrant);
    }
  }

  get_judges(guild, role, chief) {
    const g_role = guild.roles.get(role);

    return g_role ? system.get_branch_members(guild, role, chief).length : 0;
  }
}();
