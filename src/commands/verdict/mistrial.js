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
const { Command, CommandResult } = require('patron.js');
const verdict = require('../../enums/verdict.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');

module.exports = new class Mistrial extends Command {
  constructor() {
    super({
      description: 'The case gets marked as a mistrial. This does not prevent the prosecutor \
from prosecuting the defendant again.',
      groupName: 'verdicts',
      names: ['mistrial']
    });
  }

  async run(msg) {
    const c_case = db.get_channel_case(msg.channel.id);
    const res = await this.prerequisites(c_case);

    if (res instanceof CommandResult) {
      return res;
    }

    const { case_id, defendant_id } = res;
    const update = {
      guild_id: msg.channel.guild.id,
      case_id,
      defendant_id,
      verdict: verdict.mistrial
    };

    db.insert('verdicts', update);

    const {
      trial_role, jailed_role, case_channel
    } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const c_channel = msg.channel.guild.channels.get(case_channel);

    if (c_channel) {
      await system.edit_case(c_channel, c_case);
    }

    const prefix = `${discord.tag(msg.author).boldified}, `;

    if (msg.channel.guild.members.has(defendant_id)) {
      await system.free_from_court(msg.channel.guild.id, defendant_id, [trial_role, jailed_role]);
    }

    const append = await system.get_lawyer_payment(c_case, false);

    await discord.create_msg(msg.channel, `${prefix}This court case has been declared as a \
mistrial.\n\nNo verdict has been delivered in case #${c_case.id} and the accused may be \
prosecuted again.${append}`);
    await system.close_case(msg, msg.channel);

    return c_case;
  }

  async prerequisites(c_case) {
    if (!c_case) {
      return CommandResult.fromError('This channel has no ongoing court case.');
    }

    const { id: case_id, defendant_id } = c_case;
    const res = system.case_finished(case_id);

    if (res.finished) {
      return CommandResult.fromError(res.reason);
    }

    return {
      case_id, defendant_id
    };
  }
}();
