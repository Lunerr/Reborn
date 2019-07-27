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

  const { lawyer, amount } = await system.auto_pick_lawyer(guild, c_case);
  const member = guild.members.get(lawyer.member_id) || await client.getRESTUser(lawyer.member_id);

  await discord.dm(
    member.user ? member.user : member,
    `You are now the lawyer of ${defendant.mention} in case #${c_case.id}.`,
    guild
  );
  await system.accept_lawyer(defendant, member, channel, c_case, lawyer_enum.auto, false, amount);
}

client.on('guildMemberRemove', async (guild, member) => {
  const { active, c_case } = system.has_active_case(guild.id, member.id);

  if (active && member.id === c_case.defendant_id && c_case.lawyer_id === null) {
    const cmd = reg.commands.find(x => x.names[0] === 'auto_lawyer');
    const channel = guild.channels.get(c_case.channel_id);

    if (channel) {
      await cmd.mutex.sync(
        c_case.channel_id, () => cmd.auto(c_case, channel, () => get_lawyer(c_case, member, guild))
      );
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
