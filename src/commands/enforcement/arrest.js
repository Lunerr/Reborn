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
const client = require('../../services/client.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const reg = require('../../services/registry.js');
const number = require('../../utilities/number.js');
const str = require('../../utilities/string.js');
const catch_discord = require('../../utilities/catch_discord.js');
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

If this case proceeds to go to court and the defendant is found __**NOT GUILTY**__, \
you will be __**FINED**__ {0}.

If you are sure you wish to proceed with the arrest given the aforementioned terms \
and have reviewed the necessary information, please type \`yes\`.`;
const opening_msg = `{0} VS {1} (Case #{2})

{3} will be presiding over this court proceeding.

The defense is accused of violating the following law: {4} ({5})

{6}

In order to promote a just and free society, we must be biased towards **INNOCENCE!**

If you find the slightest bit of inconsistent evidence, contradictory testimony, or holes \
in the prosecution's points, **DO NOT DELIVER A GUILTY VERDICT!**

When rendering **ANY VERDICT** other than a guilty verdict, you will receive an \
additional {7} in compensation.`;
const lawyer_dm = 'You have been sent to trial (case #{0}), under warrant \
#{1}, by {2}.\n\nAs part of your rights you are allowed to a \
lawyer which can be set using `{3}request_lawyer @User amount`.\nIf you are unsure \
of which lawyer to choose you can use `{3}auto_lawyer` which will choose a \
lawyer that consents.\nLastly, if you feel that you are capable of representing yourself, \
you may do so with `{3}represent_myself`.\n\nIf you don\'t \
use any of these commands within {4} hours, your lawyer will be auto picked.';
const max_len = 14e2;
const dots = '...';
const stats = ['online', 'dnd', 'idle', 'offline'];

function get_index(string, char, max) {
  return string.slice(0, max).lastIndexOf(char);
}

function remove_from_array(arr, fn) {
  const index = arr.findIndex(fn);

  if (index !== -1) {
    arr.splice(index, 1);
  }
}

function get_members(arr) {
  let members = [];

  for (let i = 0; i < stats.length; i++) {
    const status = stats[i];
    const filtered = arr.filter(x => x.status === status);

    if (filtered.length) {
      members = filtered;
      break;
    }
  }

  return members;
}

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
      if (args.warrant.request === 1) {
        return CommandResult.fromError(
          `This warrant can only be approved using \`${config.prefix}approve\`.`
        );
      } else if (args.warrant.executed === 1) {
        return CommandResult.fromError('This warrant was already served.');
      } else if (args.warrant.defendant_id === msg.author.id) {
        return CommandResult.fromError('You cannot arrest yourself.');
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
      await discord.send_msg(msg, `I have arrested ${defendant.mention}.`);
    });
  }

  async prerequisites(msg, warrant) {
    const {
      court_category, judge_role, trial_role, jailed_role, imprisoned_role, chief_justice_role
    } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const n_warrant = db.get_warrant(warrant.id);
    const defendant = msg.channel.guild.members.get(warrant.defendant_id);

    if (defendant && defendant.roles.includes(imprisoned_role)) {
      await discord.send_msg(msg, 'This user is already muted.');

      return false;
    } else if (n_warrant.executed === 1) {
      await discord.send_msg(msg, 'This warrant has already been executed.');

      return false;
    }

    const verified = await discord.verify_msg(msg, `${str.format(
      arrest_message, number.format(Math.abs(config.not_guilty_arrest))
    )}`, null, 'yes');

    if (verified.conflicting) {
      await discord.send_msg(
        msg, 'The previous interactive command has been cancelled.'
      );

      return false;
    } else if (!verified.success) {
      await discord.send_msg(msg, 'The command has been cancelled.');

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
      guild.id, `${channel_name_cop}-VS-${channel_name_def}`,
      0, `Case for ${channel_name_cop}-VS-${channel_name_def}`, category
    );
    const edits = [judge.id, defendant.id, client.user.id];

    await Promise.all(edits.map(x => channel.editPermission(
      x, this.bitfield, 0, 'member', 'Adding members to the court case'
    ).catch(() => null)));
    await channel.edit({
      nsfw: true, reason: 'Case channel needs to be NSFW'
    });

    const law = db.get_law(warrant.law_id);
    const format = this.format_evidence(warrant.evidence);
    const evidence = Array.isArray(format) ? format[0] : format;
    const innocence_bias = number.format(config.judge_case * config.innocence_bias);
    const last_id = db.get_last_table_sequence('cases').seq + 1;
    const content = str.format(
      opening_msg,
      officer.mention, defendant.mention, last_id, judge.mention, law.name, law.id,
      warrant.evidence ? `${warrant.request === 1 ? 'Messages' : 'Evidence'}: ${evidence}` : '',
      innocence_bias
    );
    const sent = await channel.createMessage(content);

    if (Array.isArray(format)) {
      for (let i = 1; i < format.length; i++) {
        await channel.createMessage(`Continuation of Evidence #${i + 1}:\n${format[i]}`);
      }
    }

    await this.send_cmds(channel);
    await sent.pin();
    await this.close(
      channel, warrant, defendant, judge.id, officer.id, trial_role, jailed
    );
  }

  send_cmds(channel) {
    const group = reg.groups.find(x => x.name === 'verdicts');
    const obj = discord.embed({
      fields: [
        {
          name: 'The Verdict Commands', value: '', inline: false
        },
        {
          name: 'The Lawyer Commands', value: '', inline: false
        }
      ]
    });

    for (let i = 0; i < group.commands.length; i++) {
      const cmd = group.commands[i];

      obj.embed.fields[0].value += `\`${config.prefix}${cmd.names[0]}\`: ${cmd.description}\n`;
    }

    const lawyer_cmds = reg.groups
      .find(x => x.name === 'courts').commands
      .filter(x => x.description.toLowerCase().includes('set'));

    for (let i = 0; i < lawyer_cmds.length; i++) {
      const cmd = lawyer_cmds[i];

      obj.embed.fields[1].value += `\`${config.prefix}${cmd.names[0]}\`: ${cmd.description}\n`;
    }

    return channel.createMessage(obj);
  }

  format_evidence(evidence) {
    if (evidence.length <= max_len) {
      return evidence;
    }

    let index = get_index(evidence, '\n', max_len);

    if (index === -1) {
      index = get_index(evidence, ' ', max_len);
    }

    if (index !== -1) {
      const rest = evidence.slice(index + 1);

      return [evidence.slice(0, index + 1)].concat(this.format_evidence(rest));
    }

    const initial = `${evidence.slice(0, max_len - dots.length)}${dots}`;
    const rest = this.format_evidence(evidence.slice(max_len - dots.length));

    return [initial].concat(rest);
  }

  async close(channel, warrant, defendant, judge_id, plaintiff_id, role, jailed) {
    const c_case = {
      guild_id: channel.guild.id,
      channel_id: channel.id,
      warrant_id: warrant.id,
      law_id: warrant.law_id,
      defendant_id: defendant.id,
      judge_id,
      plaintiff_id
    };
    const { lastInsertRowid: id } = db.insert('cases', c_case);

    c_case.id = id;

    if (channel.guild.members.has(defendant.id)) {
      await remove_role(channel.guild.id, defendant.id, jailed, 'Defendant is on trial');
      await add_role(channel.guild.id, defendant.id, role, 'Defendant is on trial');
    }

    const cop = await client.getRESTUser(plaintiff_id);
    const judge = await client.getRESTUser(judge_id);
    const bonus = number.format(config.judge_case * config.innocence_bias);

    await discord.dm(defendant.user ? defendant.user : defendant, str.format(
      lawyer_dm,
      id, warrant.id, discord.tag(cop).boldified, config.prefix, config.auto_pick_lawyer
    ), channel.guild);
    await discord.dm(judge, `You have been selected as the judge for case #${id}.\n\nIt is \
__**CRUCIAL**__ to know that when rendering __**ANY VERDICT**__ other than a guilty verdict, \
you will receive an additional ${bonus} in compensation.`, channel.guild);
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
    let judge = guild.members.filter(mbr => !system.member_in_debt(mbr, guild)
        && (mbr.roles.includes(judge_role) || mbr.roles.includes(chief)));

    if (judge.length >= 1) {
      const ids = [warrant.judge_id, warrant.defendant_id, warrant.officer_id];

      for (let i = 0; i < ids.length; i++) {
        remove_from_array(judge, x => x.id === ids[i]);
      }

      judge = get_members(judge);
    }

    judge = judge[Math.floor(Math.random() * judge.length)];

    return judge || null;
  }
}();
