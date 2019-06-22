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
const content = `Requesting unlawful warrants will result in \
impeachment and **national disgrace**.

If you have **ANY DOUBTS WHATSOEVER ABOUT THE VALIDITY OF THIS REQUEST WARRANT**, \
do not proceed with this request warrant.

__IGNORANCE IS NOT A DEFENSE.__

If you are sure you wish to proceed with the request warrant given the aforementioned terms, \
please type \`yes\`.`;
const empty_argument = Symbol('Empty Argument');

module.exports = new class RequestWarrant extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: 'Nͥatͣeͫ763#0554',
          key: 'member',
          name: 'member',
          type: 'member'
        }),
        new Argument({
          example: 'Murder',
          key: 'law',
          name: 'law',
          type: 'law',
          preconditions: ['active_law']
        }),
        new Argument({
          example: 'https://i.imgur.com/gkxUedu.png',
          key: 'evidence',
          name: 'evidence',
          type: 'string',
          defaultValue: empty_argument,
          remainder: true
        })
      ],
      description: 'Request a warrant.',
      groupName: 'enforcement',
      names: ['request_warrant', 'request']
    });
  }

  async run(msg, args) {
    if (args.evidence === empty_argument && !msg.attachments.length) {
      return CommandResult.fromError('You must provide evidence in an image or link.');
    }

    const verified = await discord.verify_msg(
      msg, `**${discord.tag(msg.author)}**, ${content}`, null, 'yes'
    );

    if (!verified) {
      return CommandResult.fromError('The command has been cancelled.');
    }

    let evidence;

    if (args.evidence !== empty_argument && msg.attachments.length) {
      evidence = `${args.evidence}\n\n${msg.attachments.map(x => x.proxy_url).join('\n')}`;
    } else if (msg.attachments.length) {
      evidence = msg.attachments.map(x => x.proxy_url).join('\n');
    } else {
      ({ evidence } = args);
    }

    db.insert('warrants', {
      guild_id: msg.channel.guild.id,
      law_id: args.law.id,
      defendant_id: args.member.id,
      officer_id: msg.author.id,
      evidence,
      request: 1
    });
    await discord.create_msg(
      msg.channel,
      `**${discord.tag(msg.author)}**, A warrant has been requested against ${args.member.mention}.`
    );
  }
}();
