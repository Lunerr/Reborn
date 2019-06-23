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

module.exports = new class KickFromCourt extends Command {
  constructor() {
    super({
      preconditions: ['court_only', 'judge_creator'],
      args: [
        new Argument({
          example: 'Joeychin01',
          key: 'member',
          name: 'member',
          type: 'member',
          remainder: true
        })
      ],
      description: 'Kicks a citizen from speaking at a hearing.',
      groupName: 'courts',
      names: ['kick_from_court']
    });
  }

  async run(msg, args) {
    const court = db.get_channel_case(msg.channel.id);

    if (!court) {
      return CommandResult.fromError('This channel is not a court case.');
    }

    await msg.channel.deletePermission(args.member.id);
    await discord.create_msg(
      msg.channel, `**${discord.tag(msg.author)}**, Removed ${discord.tag(args.member)}.`
    );
  }
}();
