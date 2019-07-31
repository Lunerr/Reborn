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
const db = require('../services/database.js');
const reg = require('../services/registry.js');
const Timer = require('../utilities/timer.js');
const system = require('../utilities/system.js');
const discord = require('../utilities/discord.js');
const lawyer_state = require('../enums/lawyer_state.js');
const expiration = 864e5;
const bit = 2048;

async function no_plea_fn(guild, channel, c_case) {
  db.insert('fired_case_lawyers', {
    member_id: c_case.lawyer_id,
    guild_id: guild.id,
    case_id: c_case.id
  });

  const previous = guild.members.get(c_case.laywer_id)
    || await client.getRESTUser(c_case.lawyer_id);

  if (channel) {
    await channel.editPermission(previous.id, 0, bit, 'member', 'Failed to make a plea');
    await channel.createMessage(`${previous.mention} has been removed as the lawyer for \
failing to make a plea using \`${config.prefix}plea\`. A new lawyer will be hired shortly.`);
  }
}

async function new_lawyer(channel, c_case, guild, no_plea, resume = false) {
  if (!resume) {
    await discord.create_msg(channel, `The auto lawyer process has automatically begun due to \
${no_plea ? 'no plea being given' : 'no lawyer being set'} after 24 hours.`);
  }

  const { lawyer, amount } = await system.auto_pick_lawyer(guild, c_case);

  if (resume) {
    db.set_lawyer_state(lawyer_state.finished, c_case.id);
  }

  const defendant = guild.members.get(c_case.defendant_id)
    || await client.getRESTUser(c_case.defendant_id);

  await system.dm_lawyer(guild, lawyer, defendant, channel, c_case, amount);
}

async function sync(cmd, c_case, no_plea, guild, channel) {
  cmd.mutex.sync(c_case.channel_id, () => cmd.auto(c_case, channel, async () => {
    if (no_plea) {
      await no_plea_fn(guild, channel, c_case);
    }

    return new_lawyer(channel, c_case, guild, no_plea);
  }));
}

Timer(async () => {
  await discord.loop_guilds(async guild => {
    if (!guild) {
      return;
    }

    const cases = db.fetch_cases(guild.id);

    for (let i = 0; i < cases.length; i++) {
      const c_case = cases[i];
      const case_verdict = db.get_verdict(c_case.id);
      const channel = guild.channels.get(c_case.channel_id);

      if (case_verdict || !channel) {
        continue;
      }

      const auto_lawyer_cmd = reg.commands.find(x => x.names[0] === 'auto_lawyer');
      const req_lawyer_cmd = reg.commands.find(x => x.names[0] === 'request_lawyer');

      if (auto_lawyer_cmd.running[c_case.channel_id] || req_lawyer_cmd.running[c_case.channel_id]) {
        continue;
      }

      if (c_case.lawyer_state === lawyer_state.started) {
        return auto_lawyer_cmd.mutex.sync(c_case.channel_id, () => auto_lawyer_cmd.auto(
          c_case, channel, () => new_lawyer(channel, c_case, guild, null, true)
        ));
      }

      const no_plea = c_case.lawyer_id && !c_case.plea
        && Date.now() - c_case.lawyer_hired_at > expiration;
      const no_lawyer = !c_case.lawyer_id && Date.now() - c_case.created_at > expiration;

      if (!no_plea && !no_lawyer) {
        continue;
      }

      sync(auto_lawyer_cmd, c_case, no_plea, guild, channel);
    }
  });
}, config.auto_pick_lawyer_time);
