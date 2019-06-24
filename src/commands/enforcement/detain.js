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
const db = require('../../services/database.js');
const catch_discord = require('../../utilities/catch_discord.js');
const client = require('../../services/client.js');
const discord = require('../../utilities/discord.js');
const create_channel = catch_discord(client.createChannel.bind(client));
const add_role = catch_discord(client.addGuildMemberRole.bind(client));
const max_tries = 5;
const max_evidence = 10;

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
  }

  async run(msg, args) {
    return this.mutex.sync(`${msg.channel.guild.id}-${args.member.id}`, async () => {
      const { jailed_role } = db.fetch('guilds', { guild_id: msg.channel.guild.id });

      if (!args.member.roles.includes(jailed_role)) {
        await add_role(msg.channel.guild.id, args.member.id, jailed_role);
      }

      return this.verify(msg, msg.member, `What law did ${args.member.mention} break?\n
Type \`cancel\` to cancel the command.`, '', args.member).catch(console.error);
    });
  }

  async verify(msg, member, content, additional_content, to_detain, attempts = 0) {
    if (attempts >= max_tries) {
      return CommandResult.fromError(
        'You have entered an incorrect law too many times so the command has been cancelled.'
      );
    }

    const res = await discord.verify_channel_msg(
      msg,
      msg.channel,
      `${content}${additional_content}`,
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
      await discord.create_msg(
        msg.channel,
        `You have successfully detained ${to_detain.mention} under the law ${law.name}.`
      );

      return this.detain(msg, to_detain, law);
    }

    const remaining = ` You have ${max_tries - attempts - 1} more attempts remaining before \
the command automatically cancels.`;

    return this.verify(msg, member, content, remaining, to_detain, attempts + 1);
  }

  async detain(msg, member, law) {
    const msgs = await msg.channel.getMessages();
    const filtered = msgs.filter(x => x.author.id === member.id).slice(0, max_evidence);
    const evidence = filtered
      .map((x, i) => {
        let message = `${filtered.length - i}: ${x.content}`;

        if (x.attachments.length) {
          message += `\n${x.attachments.map(c => c.proxy_url)}`;
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
      judge_id: client.user.id,
      evidence,
      request: 1,
      approved: 1,
      executed: 1
    };
    const { lastInsertRowid: row_id } = db.insert('warrants', warrant);

    warrant.id = row_id;

    return this.arrest(msg, msg.author, member, warrant, law);
  }

  async arrest(msg, officer, defendant, warrant, law) {
    const { court_category, judge_role } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const judge = this.get_judge(msg.channel.guild, warrant, judge_role);
    const channel = await create_channel(
      msg.channel.guild.id,
      `${discord.formatUsername(officer.username)}-VS-\
${discord.formatUsername(defendant.username)}`,
      0,
      null,
      court_category
    );
    const edits = [judge.id, officer.id, defendant.id, client.user.id];

    await Promise.all(edits.map(x => channel.editPermission(x, this.bitfield, 0, 'member')));
    await channel.edit({ nsfw: true });

    const content = `${officer.mention} VS ${defendant.mention}

${judge.mention} will be presiding over this court proceeding.

The defense is accused of violating the following law: ${law.name}

${warrant.evidence ? `Evidence: The last messages sent by ${defendant.mention}
\`\`\`${warrant.evidence}\`\`\`` : ''}

The judge must request a plea from the accused, and must proceed assuming an innocent plea after \
12 hours without a plea. The defendant has the right to remain silent and both \
the prosecutor and defendant have the right to request a qualified and earnest attorney.`;
    const opening = await channel.createMessage(content);

    await opening.pin();
    db.insert('cases', {
      guild_id: msg.channel.guild.id,
      channel_id: channel.id,
      warrant_id: warrant.id,
      law_id: warrant.law_id,
      defendant_id: defendant.id,
      judge_id: judge.id,
      plaintiff_id: officer.id
    });
  }

  get_judge(guild, warrant, judge_role) {
    let judge = guild.members.filter(mbr => mbr.roles.includes(judge_role));

    if (judge.length > 1) {
      const warrant_judge = judge.findIndex(mbr => mbr.id === warrant.judge_id);

      if (warrant_judge !== -1) {
        judge.splice(warrant_judge, 1);
      }

      const defendant = judge.findIndex(x => x.id === warrant.defendant_id);

      if (defendant !== -1) {
        judge.splice(defendant, 1);
      }

      const active = judge.filter(x => x.status === 'online' || x.status === 'dnd');

      if (active.length > 1) {
        judge = active;
      }
    }

    judge = judge[Math.floor(Math.random() * judge.length)];

    return judge;
  }
}();
