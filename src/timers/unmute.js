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
const discord = require('../utilities/discord.js');
const client = require('../services/client.js');
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const catch_discord = require('../utilities/catch_discord.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));

async function dm(guild, user, judge_id) {
  const judge = guild.members.get(judge_id) || await client.getRESTUser(judge_id);

  return discord.dm(
    user,
    `You have served your sentence, delivered by ${judge.mention}, \
and you have been freed in ${guild.name}.`,
    guild
  );
}

function find_mute(db_verdict) {
  const verdicts = db
    .fetch_member_verdicts(db_verdict.guild_id, db_verdict.defendant_id);
  let exists = false;

  for (let i = 0; i < verdicts.length; i++) {
    if (verdicts[i].id === db_verdict.id) {
      continue;
    }

    const time_left = verdicts[i].last_modified_at + verdicts[i].sentence - Date.now();

    if (verdicts[i].served === 0 && time_left > 0) {
      exists = true;
      break;
    }
  }

  return exists;
}

Timer(async () => {
  const guilds = [...client.guilds.keys()];

  for (let k = 0; k < guilds.length; k++) {
    const verdicts = db.fetch_verdicts(guilds[k]);

    for (let i = 0; i < verdicts.length; i++) {
      const served = verdicts[i].sentence === null// || verdicts[i].served === 1;

      if (served) {
        continue;
      }

      const time_left = verdicts[i].last_modified_at + verdicts[i].sentence - Date.now();

      if (time_left > 0) {
        continue;
      }

      db.serve_verdict(verdicts[i].id);

      const guild = client.guilds.get(verdicts[i].guild_id);

      if (!guild) {
        continue;
      }

      const still_muted = find_mute(verdicts[i]);

      if (still_muted) {
        continue;
      }

      const defendant = guild.members.get(verdicts[i].defendant_id);
      const { imprisoned_role } = db.fetch('guilds', { guild_id: verdicts[i].guild_id });

      if (!defendant || !imprisoned_role || !defendant.roles.includes(imprisoned_role)) {
        continue;
      }

      await remove_role(guild.id, defendant.id, imprisoned_role, 'Auto unmute');

      const c_case = db.get_case(verdicts[i].case_id);
      const user = await client.getRESTUser(verdicts[i].defendant_id);

      await dm(guild, user, c_case ? c_case.judge_id : '');
    }
  }
}, config.auto_unmute);
