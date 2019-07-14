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

client.on('guildMemberRemove', async (guild, member) => {
  if (!Array.isArray(member.roles)) {
    return;
  }

  const { trial_role, jailed_role } = db.fetch('guilds', { guild_id: guild.id });
  const t_role = guild.roles.get(trial_role);
  const j_role = guild.roles.get(jailed_role);

  db.get_member(member.id, guild.id);

  if (t_role) {
    db.set_trial(member.roles.includes(trial_role) ? 1 : 0, guild.id, member.id);
  }

  if (j_role) {
    db.set_jailed(member.roles.includes(jailed_role) ? 1 : 0, guild.id, member.id);
  }
});
