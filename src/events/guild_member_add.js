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
const catch_discord = require('../utilities/catch_discord.js');
const verdict = require('../enums/verdict.js');
const db = require('../services/database.js');
const discord = require('../utilities/discord.js');
const number = require('../utilities/number.js');
const system = require('../utilities/system.js');
const add_role = catch_discord(client.addGuildMemberRole.bind(client));
const msg = `**BY THE PEOPLE, FOR THE PEOPLE**

Reborn is the only truly free server in Discord.

You can __**RUN FOR ELECTION**__ and get a high ranking position if you win.

You can __**IMPEACH OTHER MEMBERS**__ if they engage in corruption.

\`\`\`
THE MEMBERS OF THE SERVER HAVE COMPLETE CONTROL OF THE SERVER.
ABSOLUTE LIBERTY FOR ALL.
\`\`\``;
const bitfield = 2048;

async function grant_trial_perms(guild, member, trial_role) {
  const cases = await system.get_active_cases(guild.id, member.id);

  if (cases.length) {
    for (let i = 0; i < cases.length; i++) {
      const c_case = cases[i];
      const channel = guild.channels.get(c_case.channel_id);

      if (channel) {
        const reason = `Rejoined and has an active case (${c_case.id})`;

        await channel.editPermission(member.id, bitfield, 0, 'member', reason);
        await add_role(guild.id, member.id, trial_role, reason);
      }
    }
  }
}

client.on('guildMemberAdd', async (guild, member) => {
  await discord.dm(member.user, msg, guild);

  const { imprisoned_role, trial_role, jailed_role } = db.fetch('guilds', { guild_id: guild.id });
  const i_role = guild.roles.get(imprisoned_role);

  if (!imprisoned_role || !i_role) {
    return;
  }

  const verdicts = db.fetch_member_verdicts(guild.id, member.id);

  for (let i = 0; i < verdicts.length; i++) {
    if (verdicts[i].verdict !== verdict.guilty || verdicts[i].sentence === null) {
      continue;
    }

    const mute = verdicts[i].last_modified_at + verdicts[i].sentence - Date.now();
    const time_left = number.msToTime(verdicts[i].sentence - Date.now()).hours;
    const format = time_left ? `${time_left} hours left` : '';

    if (mute > 0) {
      await add_role(guild.id, member.id, imprisoned_role, `Mute persistence (${format})`);
      break;
    }
  }

  const j_role = guild.roles.get(jailed_role);
  const db_member = db.get_member(member.id, guild.id);

  if (member.roles.includes(imprisoned_role)) {
    db.set_jailed(0, guild.id, member.id);
  } else if (db_member) {
    if (db_member.jailed && j_role) {
      await add_role(guild.id, member.id, jailed_role, 'Role persistence');
    }
  }

  await grant_trial_perms(guild, member, trial_role);
});
