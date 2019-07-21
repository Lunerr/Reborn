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
const client = require('../../services/client.js');
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');

module.exports = new class SetLawyer extends Command {
  constructor() {
    super({
      preconditions: ['court_only', 'court_case', 'judge_creator'],
      args: [
        new Argument({
          example: 'Nͥatͣeͫ763#0554',
          key: 'member',
          name: 'member',
          type: 'member',
          preconditions: ['no_bot', 'no_self']
        })
      ],
      description: 'Sets the court case lawyer.',
      groupName: 'courts',
      names: ['set_lawyer', 'set_case_lawyer']
    });
  }

  async run(msg, args) {
    const c_case = db.get_channel_case(msg.channel.id);
    const warrant = db.get_warrant(c_case.warrant_id);

    if (args.member.id === c_case.defendant_id) {
      return CommandResult.fromError('The defendant cannot be their own lawyer.');
    } else if (args.member.id === c_case.plaintiff_id) {
      return CommandResult.fromError('The officer may not be their lawyer.');
    } else if (args.member.id === warrant.judge_id) {
      return CommandResult.fromError(
        `The ${warrant.request === 1 ? 'approving' : 'granting'} judge may not be their lawyer.`
      );
    } else if (!discord.is_online(args.member)) {
      return CommandResult.fromError('The selected lawyer must be online.');
    }

    db.set_lawyer(args.member.id, c_case.id);

    const defendant = msg.channel.guild
      .members.get(c_case.defendant_id) || await client.getRESTUser(c_case.defendant_id);

    return discord.create_msg(
      msg.channel,
      `The lawyer representing ${defendant.mention} has been set to ${args.member.mention}.`
    );
  }
}();
