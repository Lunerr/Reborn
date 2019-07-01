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

client.on('guildMemberUpdate', async (guild, new_member, old_member) => {
  if (new_member.roles.length === old_member.roles.length) {
    return;
  }

  const {
    officer_role: officer, judge_role: judge, congress_role: congress, impeachment_time
  } = db.fetch('guilds', { guild_id: guild.id });
  const g_officer = guild.roles.get(officer);
  const g_judge = guild.roles.get(judge);

  if (!officer || !g_officer || !g_judge || !g_officer) {
    return;
  }

  const jobs = {
    congress, officer, judge
  };

  // await impeached(guild, new_member, jobs, impeachment_time);
  await remove_extra_roles(guild, new_member, jobs);
});
