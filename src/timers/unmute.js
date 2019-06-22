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
const catch_discord = require('../utilities/catch_discord.js');
const client = require('../services/client.js');
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const verdict = require('../enums/verdict.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const tickTime = 10;

Timer(async () => {
  const guilds = [...client.guilds.keys()];

  for (let k = 0; k < guilds.length; k++) {
    const verdicts = db.fetch_verdicts(guilds[k]);

    for (let i = 0; i < verdicts.length; i++) {
      if (verdicts[i].verdict === verdict.pending || verdicts[i].sentence === null) {
        continue;
      }

      const time_left = verdicts[i].last_modified_at + verdicts[i].sentence - Date.now();

      if (time_left > 0) {
        continue;
      }

      const guild = client.guilds.get(verdicts[i].guild_id);

      if (!guild) {
        continue;
      }

      const defendant = guild.members.get(verdicts[i].defendant_id);
      const { imprisoned_role } = db.fetch('guilds', { guild_id: verdicts[i].guild_id });

      if (!defendant || !imprisoned_role) {
        continue;
      }

      await remove_role(guild.id, defendant.id, imprisoned_role, 'Auto unmute');
    }
  }
}, config.auto_unmute / tickTime);
