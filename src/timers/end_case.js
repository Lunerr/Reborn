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
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const system = require('../utilities/system.js');
const number = require('../utilities/number.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const verdict = require('../enums/verdict.js');
const last_message_time = 432e5;
const max_inactive = 3;
const inactive_msg = 'This court case has been marked as \
inactive due to the lack of recent activity shown towards the case.\n\
You have been impeached for failing to fulfill your duties as a judge.\n\n\
No verdict has been delivered and the prosecuted may be prosecuted again.';

async function impeach(guild, judge_id, defendant_id, judge_role, trial_role, jailed) {
  const t_role = guild.roles.get(trial_role);
  const jailed_role = guild.roles.get(jailed);
  const judge = guild.members.get(judge_id) || await client.getRESTUser(judge_id);

  await system.impeach(judge, guild, judge_role, 'Impeached for having an inactive case');

  if (jailed_role) {
    await remove_role(guild.id, defendant_id, jailed, 'Judge of an inactive case');
  }

  if (t_role) {
    await remove_role(guild.id, defendant_id, trial_role, 'Judge of an inactive case');
  }
}

async function close(c_case, guild, channel) {
  const { inactive_count, judge_id, defendant_id, plaintiff_id } = c_case;
  const judge = guild.members.get(judge_id) || await client.getRESTUser(judge_id);

  if (inactive_count >= max_inactive) {
    const {
      judge_role, trial_role, jailed_role: jailed
    } = db.fetch('guilds', { guild_id: guild.id });

    await impeach(guild, judge_id, defendant_id, judge_role, trial_role, jailed);

    const { lastInsertRowid: id } = db.insert('verdicts', {
      guild_id: guild.id,
      case_id: c_case.id,
      defendant_id: c_case.defendant_id,
      verdict: verdict.inactive,
      opinion: 'Auto closed due to inactivity'
    });

    if (channel && channel.permissionsOf(client.user.id).has('sendMessages')) {
      const msg = await channel.createMessage(`${judge.mention}\n${inactive_msg}`);

      await system.close_case(msg, channel);
    }

    await system.update_guild_case(id, guild);
  } else {
    const defendant = guild.members.get(defendant_id) || await client.getRESTUser(defendant_id);
    const cop = guild.members.get(plaintiff_id) || await client.getRESTUser(plaintiff_id);
    const pings = `${judge.mention} ${defendant.mention} ${cop.mention}`;
    const left = max_inactive - inactive_count;

    if (channel && channel.permissionsOf(client.user.id).has('sendMessages')) {
      await channel.createMessage(`${pings}\nThis case has not yet reached a verdict and there has \
been no recent activity.\nThis case will be marked as inactive ${left === 1 ? 'soon ' : ''}if no \
recent message is sent.\n\n${judge.mention}, it is your duty to proceed with the case and come to \
a verdict. Failure to do so will result in impeachment, a fine of \
${number.format(config.impeached)}, and national disgrace. `);
    }

    db.set_case_inactive_count(c_case.id, inactive_count + 1);
  }
}

Timer(async () => {
  const guilds = [...client.guilds.keys()];

  for (let k = 0; k < guilds.length; k++) {
    const guild = client.guilds.get(guilds[k]);

    if (!guild) {
      continue;
    }

    const cases = db.fetch_cases(guilds[k]);

    for (let i = 0; i < cases.length; i++) {
      const c_case = cases[i];
      const case_verdict = db.get_verdict(c_case.id);

      if (case_verdict && case_verdict.verdict !== verdict.pending) {
        continue;
      }

      const channel = guild.channels.get(c_case.channel_id);

      if (!channel) {
        continue;
      }

      const [last_msg] = await channel.getMessages(1);
      const now = Date.now();

      if (now - last_msg.timestamp < last_message_time) {
        continue;
      }

      await close(c_case, guild, channel);
    }
  }
}, config.auto_set_inactive_case_interval);
