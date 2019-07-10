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
const { Argument, Command, CommandResult } = require('patron.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const number = require('../../utilities/number.js');
const catch_discord = require('../../utilities/catch_discord.js');
const client = require('../../services/client.js');
const system = require('../../utilities/system.js');
const str = require('../../utilities/string.js');
const nominiation = require('../../enums/nomination.js');
const add_role = catch_discord(client.addGuildMemberRole.bind(client));
const to_hours = 24;
const reply = 'This user cannot receive the {0} role because they have the {1} role.';
const has = 'This user already has the {0} role.';
const nominated = '{0}, You have nominated {1} to the {2} role.';

module.exports = new class Nominate extends Command {
  constructor() {
    super({
      preconditions: [
        'usable_judge',
        'usable_officer',
        'usable_congress',
        'chief_roles_set',
        'is_chief'
      ],
      args: [
        new Argument({
          example: 'Ashley',
          key: 'member',
          name: 'member',
          type: 'member',
          preconditions: ['no_bot'],
          remainder: true
        })
      ],
      description: 'Nominates a member to your branch.',
      groupName: 'chief',
      names: ['nominate']
    });
  }

  async run(msg, args) {
    const res = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const was_impeached = db.get_impeachment(msg.channel.guild.id, args.member.id);

    if (was_impeached) {
      return this.impeached_format(was_impeached, res.impeachment_time, args.member);
    }

    const keys = Object.keys(res);
    const gov = system.chief_roles.concat(system.gov_roles);
    const has_gov = keys.find(x => gov.includes(x) && args.member.roles.includes(res[x]));
    const branch = system.branch_role_from_chief(msg.member);
    const [branch_format] = str.to_uppercase(branch || '').split('_');

    if (has_gov) {
      if (args.member.roles.includes(res[branch])) {
        return CommandResult.fromError(str.format(has, branch_format));
      }

      const role_name = has_gov
        .split('_')
        .slice(0, -1)
        .map(str.to_uppercase)
        .join(' ');

      return CommandResult.fromError(str.format(reply, branch_format, role_name));
    }

    await this.add_role(msg.author, args.member, branch, branch_format, res);

    return discord.create_msg(
      msg.channel,
      str.format(nominated, discord.tag(msg.author).boldified, args.member.mention, branch_format)
    );
  }

  async add_role(nominator, member, branch, branch_format, query) {
    const id = query[branch];

    db.insert('nominations', {
      guild_id: member.guild.id,
      nominator: nominator.id,
      nominatee: member.id,
      branch: nominiation[branch_format.toLowerCase()]
    });

    return add_role(member.guild.id, member.id, id);
  }

  impeached_format(impeachment, impeachment_time, member) {
    const time_left = impeachment.created_at + impeachment_time - Date.now();

    if (time_left > 0 && 0) {
      const { days, hours } = number.msToTime(time_left);
      const hours_left = (days * to_hours) + hours;

      return CommandResult.fromError(`This user cannot be nominated because they were impeached. \
${member.mention} can be nominated again ${hours_left ? `in ${hours_left} hours` : 'soon'}.`);
    }

    return '';
  }
}();
