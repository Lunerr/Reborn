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
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const system = require('../utilities/system.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const expiration = 3e5;

function edit_case(guild, warrant) {
  const { warrant_channel } = db.fetch('guilds', { guild_id: guild.id });
  const w_channel = guild.channels.get(warrant_channel);

  if (w_channel) {
    const new_warrant = Object.assign(warrant, { executed: 1 });

    return system.edit_warrant(w_channel, new_warrant);
  }
}

Timer(async () => {
  const keys = [...client.guilds.keys()];

  for (let i = 0; i < keys.length; i++) {
    const guild = client.guilds.get(keys[i]);

    if (!guild) {
      continue;
    }

    const warrants = db.fetch_warrants(guild.id);

    for (let j = 0; j < warrants.length; j++) {
      const warrant = warrants[j];

      if (warrant.executed === 1 || warrant.request === 0 || warrant.approved === 1) {
        continue;
      }

      const time_left = warrant.created_at + expiration - Date.now();

      if (time_left > 0) {
        continue;
      }

      const { jailed_role, officer_role } = db.fetch('guilds', { guild_id: guild.id });
      const defendant = guild.members.get(warrant.defendant_id);
      const officer = guild.members.get(warrant.officer_id);

      if (defendant && defendant.roles.includes(jailed_role)) {
        await remove_role(guild.id, warrant.defendant_id, jailed_role, 'Unapproved detain');
      }

      if (officer && officer.roles.includes(officer_role)) {
        await remove_role(guild.id, warrant.officer_id, officer_role, 'Unapproved detain');
      }

      db.insert('impeachments', {
        member_id: warrant.officer_id, guild_id: guild.id
      });
      db.close_warrant(warrant.id);
      edit_case(guild, warrant);
    }
  }
}, config.detain_approved);
