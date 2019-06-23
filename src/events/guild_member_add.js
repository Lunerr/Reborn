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
const send_msg = catch_discord(client.createMessage.bind(client));
const msg = `**BY THE PEOPLE, FOR THE PEOPLE**

Reborn is the only truly free server in Discord.

You can __**RUN FOR ELECTION**__ and get a high ranking position if you win.

You can __**IMPEACH OTHER MEMBERS**__ if they engage in corruption.

\`\`\`
THE MEMBERS OF THE SERVER HAVE COMPLETE CONTROL OF THE SERVER.
ABSOLUTE LIBERTY FOR ALL.
\`\`\``;

client.on('guildMemberAdd', async (guild, member) => {
  const dm_channel = await member.user.getDMChannel();

  await send_msg(dm_channel.id, msg);
});
