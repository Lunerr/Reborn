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
const db = require('../services/database.js');
const system = require('../utilities/system.js');
const reg = require('../services/registry.js');
const discord = require('../utilities/discord.js');
const lawyer_enum = require('../enums/lawyer.js');

async function get_lawyer(c_case, channel, defendant, guild) {
  await discord.create_msg(channel, 'The auto lawyer process has automatically begun due to \
the defendant of the case leaving the server.');

  const { lawyer, amount } = await system.auto_pick_lawyer(guild, c_case, '_remove');

  await system.dm_lawyer(guild, lawyer, defendant, channel, c_case, amount);
}

function get_active_cases(defendant_id, guild_id) {
  const cases = db.fetch_cases(guild_id).filter(x => x.defendant_id === defendant_id);
  const arr = [];

  for (let i = 0; i < cases.length; i++) {
    const case_verdict = db.get_verdict(cases[i].id);

    if (!case_verdict && (cases[i].request === lawyer_enum.self || cases[i].lawyer_id === null)) {
      arr.push(cases[i]);
    }
  }

  return arr;
}

client.on('guildMemberRemove', async (guild, member) => {
  const cases = get_active_cases(member.id, guild.id);

  if (cases.length) {
    const cmd = reg.commands.find(x => x.names[0] === 'auto_lawyer');

    for (let i = 0; i < cases.length; i++) {
      const channel = guild.channels.get(cases[i].channel_id);

      if (!channel) {
        continue;
      }

      cmd.mutex.sync(cases[i].channel_id, () => cmd.auto(
        cases[i], channel, () => get_lawyer(cases[i], channel, member, guild)
      ));
    }
  }

  if (!Array.isArray(member.roles)) {
    return;
  }

  const { jailed_role } = db.fetch('guilds', { guild_id: guild.id });
  const j_role = guild.roles.get(jailed_role);

  db.get_member(member.id, guild.id);

  if (j_role) {
    db.set_jailed(member.roles.includes(jailed_role) ? 1 : 0, guild.id, member.id);
  }
});
