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
const catch_discord = require('../utilities/catch_discord.js');
const discord = require('../utilities/discord.js');
const number = require('../utilities/number.js');
const string = require('../utilities/string.js');
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const system = require('../utilities/system.js');
const notifications = require('../enums/notifications.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));
const expiration = 3e5;
const extended_expiration = 432e5;
const regular_dm = 6e4;
const extended_dm = 9e5;
const to_week = 6048e5;

function edit_case(guild, warrant) {
  const { warrant_channel } = db.fetch('guilds', { guild_id: guild.id });
  const w_channel = guild.channels.get(warrant_channel);

  if (w_channel) {
    const new_warrant = Object.assign(warrant, { executed: 1 });

    return system.edit_warrant(w_channel, new_warrant);
  }
}

function get_judges(guild, role, chief) {
  const g_role = guild.roles.get(role);

  return g_role ? system.get_branch_members(guild, role, chief) : [];
}

async function dm(warrant, time_left, officer, judges, guild) {
  const now = Date.now();
  const notification = db.get_notification(officer.id, guild.id, notifications.detainment);
  const last_notified = now - (notification || { last_notified: 0 }).last_notified;
  const past = warrant.extended_time ? last_notified > extended_dm : last_notified > regular_dm;

  if (!notification || past) {
    const { hours, minutes } = number.msToTime(time_left);
    let format;

    if (hours) {
      format = `${hours} hours`;

      if (minutes) {
        format += ` and ${minutes} minutes`;
      }
    } else {
      format = `${minutes} minutes`;
    }

    if (officer) {
      const judge_append = judges.length ? `You may DM one of the following judges to \
request that they grant your warrant: ${string.list(judges.map(x => x.user.mention))}` : '';

      await discord.dm(officer.user, `You will be automatically impeached if you do not get a \
warrant in the next ${format}.\n\nYour warrant may be approved with the following \
command: \`!approve ${warrant.id}\`.\n\n${judge_append}`, guild);

      if (notification) {
        db.set_last_notified(officer.id, guild.id, notifications.detainment, now);
      } else {
        db.insert('notifications', {
          guild_id: guild.id,
          member_id: officer.id,
          type: notifications.detainment,
          last_notified: now
        });
      }
    }
  }
}

async function impeach(guild, warrant, defendant, officer, roles) {
  db.insert('impeachments', {
    member_id: warrant.officer_id, guild_id: guild.id
  });

  if (defendant && defendant.roles.includes(roles.jailed_role)) {
    await remove_role(guild.id, warrant.defendant_id, roles.jailed_role, 'Unapproved detain');
  }

  if (officer) {
    if (officer.roles.includes(roles.officer_role)) {
      await remove_role(guild.id, warrant.officer_id, roles.officer_role, 'Unapproved detain');
    }

    const not_impeached = new Date(Date.now() + to_week);

    await discord.dm(officer.user, `You have been impeached for not getting your warrant \
(${warrant.id}) approved within ${warrant.extended_time ? '12 hours' : '5 minutes'}.\n\nYou will \
not be able to receive a government official role until ${not_impeached.toLocaleString()}.`, guild);
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

      const time = warrant.extended_time ? extended_expiration : expiration;
      const time_left = warrant.created_at + time - Date.now();
      const {
        judge_role, jailed_role, officer_role, chief_justice_role
      } = db.fetch('guilds', { guild_id: guild.id });
      const officer = guild.members.get(warrant.officer_id);

      if (time_left > 0) {
        const judges = get_judges(guild, judge_role, chief_justice_role);

        await dm(warrant, time_left, officer, judges, guild);
        continue;
      }

      const defendant = guild.members.get(warrant.defendant_id);

      await impeach(guild, warrant, defendant, officer, {
        jailed_role, officer_role
      });
      db.close_warrant(warrant.id);
      edit_case(guild, warrant);
    }
  }
}, config.detain_approved);
