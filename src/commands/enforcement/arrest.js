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
const catch_discord = require('../../utilities/catch_discord.js');
const { config } = require('../../services/data.js');
const client = require('../../services/client.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const reg = require('../../services/registry.js');
const create_channel = catch_discord(client.createChannel.bind(client));
const add_role = catch_discord(client.addGuildMemberRole.bind(client));
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const arrest_message = `Executing unlawful warrants will result in \
impeachment and **national disgrace**.

If you have **ANY DOUBTS WHATSOEVER ABOUT THE VALIDITY OF THIS WARRANT**, \
do not proceed with this arrest.

__IGNORANCE IS NOT A DEFENSE.__

Furthermore, if you perform this arrest, **you will need to prosecute it in court.** \
This may take days. This will be time consuming. If you fail to properly prosecute the case, \
you will be impeached.

If you are sure you wish to proceed with the arrest given the aforementioned terms \
and have reviewed the necessary information, please type \`yes\`.`;
const max_len = 15e2;
const dots = '...';

module.exports = new class Arrest extends Command {
  constructor() {
    super({
      preconditions: ['can_trial', 'usable_gov_role', 'usable_court'],
      preconditionOptions: [{}, { roles: ['officer_role'] }],
      args: [
        new Argument({
          example: '845',
          key: 'warrant',
          name: 'warrant',
          type: 'warrant'
        })
      ],
      description: 'Arrest a citizen.',
      groupName: 'enforcement',
      names: ['arrest']
    });
    this.bitfield = 2048;
    this.mutex = new MultiMutex();
  }

  async run(msg, args) {
    return this.mutex.sync(`${msg.channel.guild.id}-${args.warrant.id}`, async () => {
      if (args.warrant.executed === 1) {
        return CommandResult.fromError('This warrant was already served.');
      } else if (args.warrant.defendant_id === msg.author.id) {
        return CommandResult.fromError('You cannot arrest yourself.');
      } else if (args.warrant.request === 1 && args.warrant.approved === 0) {
        return CommandResult.fromError('This request warrant has not been approved by a judge.');
      }

      const res = await this.prerequisites(msg, args.warrant);

      if (!res) {
        return;
      }

      const defendant = (msg.channel.guild.members.get(args.warrant.defendant_id) || {}).user
        || await client.getRESTUser(args.warrant.defendant_id);
      const {
        court_category, judge_role, trial_role, chief_justice_role: chief, jailed_role
      } = res;
      const judge = this.get_judge(msg.channel.guild, args.warrant, judge_role, chief);

      if (!judge) {
        return CommandResult.fromError('There is no judge to serve the case.');
      }

      await this.set_up({
        guild: msg.channel.guild, defendant, judge, officer: msg.author, trial_role,
        warrant: args.warrant, category: court_category, jailed: jailed_role
      });

      const prefix = `${discord.tag(msg.author).boldified}, `;

      await discord.create_msg(msg.channel, `${prefix}I have arrested ${defendant.mention}.`);
    });
  }

  async prerequisites(msg, warrant) {
    const {
      court_category, judge_role, trial_role, jailed_role, chief_justice_role
    } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const n_warrant = db.get_warrant(warrant.id);
    const prefix = `${discord.tag(msg.author).boldified}, `;

    if (n_warrant.executed === 1) {
      await discord.create_msg(msg, `${prefix}This warrant has already been executed.`);

      return false;
    }

    const verified = await discord.verify_msg(msg, `${arrest_message}`, null, 'yes');

    if (!verified) {
      await discord.create_msg(msg.channel, `${prefix}The command has been cancelled.`);

      return false;
    }

    return {
      court_category, judge_role, trial_role, chief_justice_role, jailed_role
    };
  }

  async set_up({ guild, defendant, judge, officer, warrant, trial_role, jailed, category }) {
    const channel_name_cop = discord.formatUsername(officer.username).trim() || 'reborn';
    const channel_name_def = discord.formatUsername(defendant.username).trim() || 'the_people';
    const channel = await create_channel(
      guild.id,
      `${channel_name_cop}-VS-${channel_name_def}`,
      0,
      null,
      category
    );
    const edits = [judge.id, officer.id, defendant.id, guild.shard.client.user.id];

    await Promise.all(edits.map(
      x => channel.editPermission(x, this.bitfield, 0, 'member').catch(() => Promise.resolve({}))
    ));
    await channel.edit({ nsfw: true });

    const law = db.get_law(warrant.law_id);
    const format = this.format_evidence(warrant.evidence);
    const evidence = Array.isArray(format) ? format[0] : format;
    const content = `${officer.mention} VS ${defendant.mention}

${judge.mention} will be presiding over this court proceeding.

The defense is accused of violating the following law: ${law.name}

${warrant.evidence ? `${warrant.request === 1 ? 'Messages' : 'Evidence'}: ${evidence}` : ''}

The judge must request a plea from the accused, and must proceed assuming an innocent plea after \
12 hours without a plea. The defendant has the right to remain silent and both \
the prosecutor and defendant have the right to request a qualified and earnest attorney.`;
    const sent = await channel.createMessage(content);

    if (Array.isArray(format)) {
      for (let i = 1; i < format.length; i++) {
        await channel.createMessage(`Continuation of Evidence #${i + 1}:${format[i]}`);
      }
    }

    await this.send_cmds(channel);
    await sent.pin();
    await this.close(channel, warrant, defendant.id, judge.id, officer.id, trial_role, jailed);
  }

  send_cmds(channel) {
    const group = reg.groups.find(x => x.name === 'verdicts');
    const obj = discord.embed({
      title: 'The Verdict Commands', description: ''
    });

    for (let i = 0; i < group.commands.length; i++) {
      const cmd = group.commands[i];

      obj.embed.description += `\`${config.prefix}${cmd.names[0]}\`: ${cmd.description}\n`;
    }

    return channel.createMessage(obj);
  }

  get_index(string, char, max) {
    return string.slice(0, max).lastIndexOf(char);
  }

  format_evidence(evidence) {
    if (evidence.length <= max_len) {
      return evidence;
    }

    let index = this.get_index(evidence, '\n', max_len);

    if (index === -1) {
      index = this.get_index(' ');
    }

    if (index !== -1) {
      const rest = evidence.slice(index);

      return [evidence.slice(0, index)].concat(this.format_evidence(rest));
    }

    const initial = `${evidence.slice(0, max_len - dots.length)}${dots}`;
    const rest = this.format_evidence(evidence.slice(max_len - dots.length));

    return [initial].concat(rest);
  }

  async close(channel, warrant, defendant_id, judge_id, plaintiff_id, role, jailed) {
    const c_case = {
      guild_id: channel.guild.id,
      channel_id: channel.id,
      warrant_id: warrant.id,
      law_id: warrant.law_id,
      defendant_id,
      judge_id,
      plaintiff_id
    };
    const { lastInsertRowid: id } = db.insert('cases', c_case);

    c_case.id = id;

    if (channel.guild.members.has(defendant_id)) {
      await remove_role(channel.guild.id, defendant_id, jailed);
      await add_role(channel.guild.id, defendant_id, role);
    }

    db.close_warrant(warrant.id);

    const { warrant_channel, case_channel } = db.fetch('guilds', { guild_id: channel.guild.id });
    const c_channel = channel.guild.channels.get(case_channel);

    if (c_channel) {
      await system.add_case(c_channel, c_case);
    }

    const w_channel = channel.guild.channels.get(warrant_channel);

    if (w_channel) {
      const new_warrant = Object.assign(warrant, { executed: 1 });

      return system.edit_warrant(w_channel, new_warrant);
    }
  }

  get_judge(guild, warrant, judge_role, chief) {
    let judge = guild.members
      .filter(mbr => mbr.roles.includes(judge_role) || mbr.roles.includes(chief));

    if (judge.length >= 1) {
      const warrant_judge = judge.findIndex(mbr => mbr.id === warrant.judge_id)

      if (warrant_judge !== -1) {
        judge.splice(warrant_judge, 1);
      }

      const defendant = judge.findIndex(x => x.id === warrant.defendant_id);

      if (defendant !== -1) {
        judge.splice(defendant, 1);
      }

      const prosecutor = judge.findIndex(x => x.id === warrant.officer_id);

      if (prosecutor !== -1) {
        judge.splice(prosecutor, 1);
      }

      const active = judge.filter(discord.is_online);

      if (active.length >= 1) {
        judge = active;
      }
    }

    judge = judge[Math.floor(Math.random() * judge.length)];

    return judge || null;
  }
}();
