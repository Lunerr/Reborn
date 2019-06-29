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
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const system = require('../utilities/system.js');
const verdict = require('../enums/verdict.js');
const last_message_time = 432e5;
const max_inactive = 3;
const bitfield = 2048;

async function close(c_case, guild, channel) {
  const { inactive_count } = c_case;
  const judge = guild.members.get(c_case.judge_id) || await client.getRESTUser(c_case.judge_id);

  if (inactive_count >= max_inactive) {
    const { lastInsertRowid: id } = db.insert('verdicts', {
      guild_id: guild.id,
      case_id: c_case.id,
      defendant_id: c_case.defendant_id,
      verdict: verdict.inactive
    });

    (await channel.createMessage(`${judge.mention}\nThis court case has been marked as inactive due \
to no recent activity.`)).pin();
    await Promise.all(channel.permissionOverwrites.map(
      x => channel.editPermission(x.id, 0, bitfield, x.type, 'Case is over')
    ));

    const new_case = db.get_case(id);
    const { case_channel } = db.fetch('guilds', { guild_id: guild.id });
    const c_channel = guild.channels.get(case_channel);

    if (c_channel) {
      await system.edit_case(c_channel, new_case);
    }
  } else {
    const defendant = guild.members.get(c_case.defendant_id);

    await channel.createMessage(
      `${defendant ? `${judge.mention}\n` : ''}This case has not yet reached a verdict \
and there has been no recent activity. This case will be marked as inactive after \
${max_inactive - inactive_count} more reminder messages if no recent message is sent.`
    );
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
