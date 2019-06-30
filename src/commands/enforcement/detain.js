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
const { Argument, Command, CommandResult, MultiMutex } = require('patron.js');
const { config } = require('../../services/data.js');
const db = require('../../services/database.js');
const catch_discord = require('../../utilities/catch_discord.js');
const client = require('../../services/client.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const add_role = catch_discord(client.addGuildMemberRole.bind(client));
const max_evidence = 10;
const fetch_limit = 100;

module.exports = new class Detain extends Command {
  constructor() {
    super({
      preconditions: ['can_jail', 'usable_court', 'usable_officer', 'usable_judge'],
      args: [
        new Argument({
          example: 'Serena',
          key: 'member',
          name: 'member',
          type: 'member',
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
    const key = `${msg.channel.guild.id}-${msg.author.id}-${args.member.id}`;

    if (this.running[key]) {
      return;
    }

    return this.mutex.sync(key, async () => {
      this.running[key] = true;

      const { jailed_role } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
      const res = await this.verify(msg, msg.member, `What law did ${args.member.mention} break?\n
Type \`cancel\` to cancel the command.`, args.member);

      if (res instanceof CommandResult) {
        this.running[key] = null;

        return res;
      }

      if (!args.member.roles.includes(jailed_role)) {
        await add_role(msg.channel.guild.id, args.member.id, jailed_role);
      }

      this.running[key] = null;
    });
  }

  async verify(msg, member, content, to_detain) {
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
      return this.detain(msg, to_detain, law);
    }

    const new_content = `This law does not exist, please try again.\n
Type \`cancel\` to cancel the command.`;

    return this.verify(msg, member, new_content, to_detain);
  }

  async detain(msg, member, law) {
    const msgs = await msg.channel.getMessages(fetch_limit);
    const filtered = msgs.filter(x => x.author.id === member.id).slice(0, max_evidence);
    const evidence = filtered
      .map((x, i) => {
        let message = `${filtered.length - i}. ${x.content}`;

        if (x.attachments.length) {
          message += ` ${x.attachments.map(c => c.proxy_url).join(', ')}`;
        }

        return message;
      })
      .reverse()
      .join('\n')
      .trim();
    const warrant = {
      guild_id: msg.channel.guild.id,
      law_id: law.id,
      defendant_id: member.id,
      officer_id: msg.author.id,
      evidence: `\n${discord.sanitize_mentions(msg, evidence)}`,
      request: 1
    };
    const { lastInsertRowid: id } = db.insert('warrants', warrant);

    warrant.id = id;
    await discord.create_msg(
      msg.channel, `You have successfully detained ${member.mention} and a warrant has been \
created under the law ${law.name}.\n\nA judge must approve this this detainment with the \
\`${config.prefix}approve\` command within 5 minutes or else you will get impeached.`
    );

    const { warrant_channel } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const w_channel = msg.channel.guild.channels.get(warrant_channel);

    if (w_channel) {
      await system.add_warrant(w_channel, warrant);
    }
  }
}();
