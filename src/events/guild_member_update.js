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
const client = require('../services/client.js');
const catch_discord = require('../utilities/catch_discord.js');
const discord = require('../utilities/discord.js');
const number = require('../utilities/number.js');
const db = require('../services/database.js');
const verdict = require('../enums/verdict.js');
const system = require('../utilities/system.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const edit_member = catch_discord(client.editGuildMember.bind(client));
const to_hours = 24;

async function impeached(guild, member, jobs, impeachment_time) {
  const { roles: n_roles } = member;
  const was_impeached = db.get_impeachment(guild.id, member.id);
  const values = Object.values(jobs);

  if (was_impeached && values.some(x => n_roles.includes(x))) {
    const time_left = was_impeached.created_at + impeachment_time - Date.now();

    if (time_left > 0) {
      const { days, hours } = number.msToTime(time_left);
      const hours_left = (days * to_hours) + hours;
      const reason = `This user cannot be an official because they were impeached. \
${discord.tag(member.user)} can be an official again \
${hours_left ? `in ${hours_left} hours` : 'soon'}.`;
      const has = n_roles.filter(x => values.includes(x));

      for (let i = 0; i < has.length; i++) {
        await remove_role(guild.id, member.id, has[i], reason);
      }
    }
  }
}

async function remove_extra_roles(guild, member, jobs) {
  const roles = Object.values(jobs).filter(x => member.roles.includes(x));
  const set_roles = member.roles.slice();

  if (roles.length > 1) {
    roles.shift();

    for (let i = 0; i < roles.length; i++) {
      const index = set_roles.findIndex(x => x === roles[i]);

      if (index !== -1) {
        set_roles.splice(index, 1);
      }
    }

    await edit_member(
      guild.id, member.id, { roles: set_roles }, 'Holding several job positions at once'
    );
  }
}

async function edit_case(guild, id) {
  const new_case = db.get_case(id);
  const { case_channel } = db.fetch('guilds', { guild_id: guild.id });
  const c_channel = guild.channels.get(case_channel);

  if (c_channel) {
    await system.edit_case(c_channel, new_case);
  }
}

async function free(guild, defendant, trial_role, jailed_role) {
  const t_role = guild.roles.get(trial_role);
  const j_role = guild.roles.get(jailed_role);

  if (guild.members.has(defendant.id)) {
    if (t_role) {
      await remove_role(guild.id, defendant.id, trial_role, 'Mistrial due to judge losing role.');
    }

    if (j_role) {
      await remove_role(guild.id, defendant.id, jailed_role, 'Mistrial due to judge losing role.');
    }
  }
}

async function lost_judge(member) {
  const cases = db.fetch_cases(member.guild.id);

  for (let i = 0; i < cases.length; i++) {
    const c_case = cases[i];
    const case_verdict = db.get_verdict(c_case.id);

    if (case_verdict && case_verdict.verdict !== verdict.pending) {
      continue;
    }

    const channel = member.guild.channels.get(c_case.channel_id);

    if (!channel) {
      continue;
    }

    const { lastInsertRowid: id } = db.insert('verdicts', {
      guild_id: member.guild.id,
      case_id: c_case.id,
      defendant_id: c_case.defendant_id,
      verdict: verdict.mistrial,
      opinion: 'Automatically marked as a mistrial due to the judge losing their role'
    });
    const { defendant_id, judge_id, plaintiff_id } = c_case;
    const { trial_role, jailed_role } = db.fetch('guilds', { guild_id: member.guild.id });
    const judge = member.guild.members.get(judge_id) || await client.getRESTUser(judge_id);
    const def = member.guild.members.get(defendant_id) || await client.getRESTUser(defendant_id);
    const cop = member.guild.members.get(plaintiff_id) || await client.getRESTUser(plaintiff_id);
    const msg = await channel.createMessage(`${cop.mention} ${def.mention} ${judge.mention}
This case has been marked as a mistrial due to the judge losing their judge role.`);

    await free(member.guild, def, trial_role, jailed_role);
    await system.close_case(msg, channel);
    await edit_case(member.guild, id);
  }
}

client.on('guildMemberUpdate', async (guild, new_member, old_member) => {
  if (new_member.roles.length === old_member.roles.length) {
    return;
  }

  const {
    officer_role: officer, judge_role: judge, congress_role: congress, impeachment_time
  } = db.fetch('guilds', { guild_id: guild.id });
  const g_judge = guild.roles.get(judge);

  if (g_judge && old_member.roles.includes(judge) && !new_member.roles.includes(judge)) {
    await lost_judge(new_member, g_judge);
  }

  const g_officer = guild.roles.get(officer);

  if (!officer || !g_officer || !g_judge || !g_officer) {
    return;
  }

  const jobs = {
    congress, officer, judge
  };

  // await impeached(guild, new_member, jobs, impeachment_time);
  await remove_extra_roles(guild, new_member, jobs);
});
