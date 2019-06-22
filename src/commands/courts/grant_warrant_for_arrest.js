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
const content = `Granting unlawful warrants will result in \
impeachment and **national disgrace**.

If you have **ANY DOUBTS WHATSOEVER ABOUT THE VALIDITY OF THIS WARRANT**, \
do not proceed with this grant.

__IGNORANCE IS NOT A DEFENSE.__

If you are sure you wish to proceed with granting this warrant given the aforementioned \
terms, please type \`I'm sure\`.`;

module.exports = new class GrantWarrantForArrest extends Command {
  constructor() {
    super({
      preconditions: ['judges'],
      args: [
        new Argument({
          example: 'John',
          key: 'member',
          name: 'member',
          type: 'member'
        }),
        new Argument({
          example: 'Murder',
          key: 'law',
          name: 'law',
          type: 'law',
          preconditions: ['active_law'],
          remainder: true
        })
      ],
      description: 'Grants a warrant to arrest a citizen.',
      groupName: 'courts',
      names: ['grant_warrant_for_arrest']
    });
  }

  async run(msg, args) {
    const verified = await discord.verify_msg(msg, `**${discord.tag(msg.author)}**, ${content}`);

    if (!verified) {
      return CommandResult.fromError('The command has been cancelled.');
    }

    db.insert('warrants', {
      guild_id: msg.channel.guild.id,
      law_id: args.law.id,
      defendant_id: args.member.id,
      judge_id: msg.author.id
    });
    await discord.create_msg(
      msg.channel,
      `**${discord.tag(msg.author)}**, A warrant has been issued against ${args.member.mention}.`
    );
  }
}();
