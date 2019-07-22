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
const { Argument, Command, CommandResult } = require('patron.js');
const { config } = require('../../services/data.js');
const client = require('../../services/client.js');
const verdict = require('../../enums/verdict.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');
const number = require('../../utilities/number.js');

module.exports = new class NotGuilty extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'Set this man free!',
          key: 'opinion',
          name: 'opinion',
          type: 'string',
          remainder: true
        })
      ],
      description: 'Renders a not guilty verdict in the court case.',
      groupName: 'verdicts',
      names: ['not_guilty']
    });
  }

  async run(msg, args) {
    const c_case = db.get_channel_case(msg.channel.id);
    const { defendant_id, id: case_id } = c_case;
    const defendant = msg.channel.guild.members.get(defendant_id);
    const res = system.case_finished(case_id);

    if (res.finished) {
      return CommandResult.fromError(res.reason);
    }

    db.insert('verdicts', {
      guild_id: msg.channel.guild.id,
      case_id,
      defendant_id,
      verdict: verdict.innocent,
      opinion: args.opinion
    });
    await this.free(msg.channel.guild, defendant);

    const { case_channel } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const c_channel = msg.channel.guild.channels.get(case_channel);

    if (c_channel) {
      await system.edit_case(c_channel, c_case);
    }

    const prefix = `${discord.tag(msg.author).boldified}, `;
    const def = defendant || await client.getRESTUser(defendant_id);
    const amount = config.judge_case * (1 + config.innocence_bias);

    await discord.create_msg(
      msg.channel,
      `${prefix}The court has found ${def.mention} not guilty.\n\n${msg.member.mention}, you have \
been rewarded with ${number.format(amount)} for delivering the verdict in case #${c_case.id}.`
    );
    await system.close_case(msg, msg.channel);

    return c_case;
  }

  async free(guild, defendant) {
    if (defendant) {
      const { trial_role, jailed_role } = db.fetch('guilds', { guild_id: guild.id });

      await system.free_from_court(guild.id, defendant.id, [trial_role, jailed_role]);
    }
  }
}();
