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
const catch_discord = require('../../utilities/catch_discord.js');
const client = require('../../services/client.js');
const verdict = require('../../enums/verdict.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));

module.exports = new class NotGuilty extends Command {
  constructor() {
    super({
      preconditions: ['court_only', 'can_trial', 'judge_creator'],
      args: [
        new Argument({
          example: '"Set this man free!"',
          key: 'opinion',
          name: 'opinion',
          type: 'string'
        })
      ],
      description: 'Declares an innocent verdict in court.',
      groupName: 'courts',
      names: ['not_guilty']
    });
  }

  async run(msg, args) {
    const {
      channel_id, defendant_id, id: case_id
    } = db.get_channel_case(msg.channel.id);
    const defendant = msg.channel.guild.members.get(defendant_id);

    if (!channel_id) {
      return CommandResult.fromError('This channel is not a court case.');
    } else if (!defendant) {
      return CommandResult.fromError('The defendant has left the server.');
    }

    const currrent_verdict = db.get_verdict(case_id);
    const finished = currrent_verdict && currrent_verdict.verdict !== verdict.pending;

    if (finished) {
      if (currrent_verdict.verdict === verdict.mistrial) {
        return CommandResult.fromError('This case has already been declared as a mistrial.');
      }

      return CommandResult.fromError('This case has already reached a verdict.');
    }

    await this.free(msg.channel.guild, defendant);

    const update = {
      guild_id: msg.channel.guild.id,
      case_id,
      defendant_id,
      verdict: verdict.innocent,
      opinion: args.opinion
    };

    db.insert('verdicts', update);

    const prefix = `**${discord.tag(msg.author)}**, `;

    await Promise.all(
      msg.channel.permissionOverwrites.map(x => msg.channel.deletePermission(x.id, 'Case is over'))
    );
    await discord.create_msg(
      msg.channel, `${prefix} The court has found ${defendant.mention} not guilty.`
    );
    await msg.pin();
  }

  async free(guild, defendant) {
    const { trial_role } = db.fetch('guilds', { guild_id: guild.id });

    await remove_role(guild.id, defendant.id, trial_role);
  }
}();
