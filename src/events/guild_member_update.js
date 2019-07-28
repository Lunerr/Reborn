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
const client = require('../services/client.js');
const { config } = require('../services/data.js');
const catch_discord = require('../utilities/catch_discord.js');
const discord = require('../utilities/discord.js');
const number = require('../utilities/number.js');
const db = require('../services/database.js');
const verdict = require('../enums/verdict.js');
const notifications = require('../enums/notifications.js');
const system = require('../utilities/system.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const edit_member = catch_discord(client.editGuildMember.bind(client));
const to_hours = 24;

async function impeached(guild, member, jobs, impeachment_time) {
  const { roles: n_roles } = member;
  const was_impeached = db.get_impeachment(guild.id, member.id, false);
  const values = Object.values(jobs);

  if (was_impeached && values.some(x => n_roles.includes(x))) {
    const time_left = was_impeached.last_modified_at + impeachment_time - Date.now();

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

async function lost_judge(member, guild) {
  const cases = db.fetch_cases(guild.id);

  for (let i = 0; i < cases.length; i++) {
    const c_case = cases[i];

    if (c_case.judge_id !== member.id) {
      continue;
    }

    console.log(c_case.judge_id);

    const case_verdict = db.get_verdict(c_case.id);

    if (case_verdict) {
      continue;
    }

    const channel = guild.channels.get(c_case.channel_id);

    if (!channel) {
      continue;
    }

    db.insert('verdicts', {
      guild_id: guild.id,
      case_id: c_case.id,
      defendant_id: c_case.defendant_id,
      verdict: verdict.mistrial,
      opinion: 'Automatically marked as a mistrial due to the judge losing their role'
    });

    const { defendant_id, judge_id, plaintiff_id } = c_case;
    const { trial_role, jailed_role } = db.fetch('guilds', { guild_id: guild.id });
    const judge = guild.members.get(judge_id) || await client.getRESTUser(judge_id);
    const def = guild.members.get(defendant_id) || await client.getRESTUser(defendant_id);
    const cop = guild.members.get(plaintiff_id) || await client.getRESTUser(plaintiff_id);
    const msg = await channel.createMessage(`${cop.mention} ${def.mention} ${judge.mention}
This case has been marked as a mistrial due to the judge losing their judge role.`);

    await free(guild, def, trial_role, jailed_role);
    await system.close_case(msg, channel);
    await system.update_guild_case(c_case.id, guild);
  }
}

client.on('guildMemberUpdate', async (guild, new_member, old_member) => {
  await lost_judge(await client.getRESTUser('346480661642608641'), guild);

  if (new_member.roles.length === old_member.roles.length) {
    return;
  }

  const res = db.fetch('guilds', { guild_id: guild.id });
  const judge = x => x.roles.includes(res.judge_role) || x.roles.includes(res.chief_justice_role);

  if (judge(old_member) && !judge(new_member)) {
    await lost_judge(new_member, guild);
  }

  const is_chief = x => system.chief_roles.some(c => x.roles.includes(res[c]));

  if (is_chief(old_member) && !is_chief(new_member)) {
    db.set_last_notified(new_member.id, guild.id, notifications.nominations, null);
  }

  const jobs = system.gov_roles.concat(system.chief_roles)
    .filter(x => res[x])
    .reduce((a, b) => {
      const value = res[b];

      a[b] = value;

      return a;
    }, {});

  await impeached(guild, new_member, jobs, config.impeachment_time);
  await remove_extra_roles(guild, new_member, jobs);
});
