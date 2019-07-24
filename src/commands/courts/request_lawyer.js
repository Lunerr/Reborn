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
const discord = require('../../utilities/discord.js');
const str = require('../../utilities/string.js');
const number = require('../../utilities/number.js');
const system = require('../../utilities/system.js');
const db = require('../../services/database.js');
const accept_message = '{0} is offering {1} for you to be their lawyer in case #{2}.\n\nReply with \
`yes` within 5 minutes to accept or `no` to decline to this offer.';

module.exports = new class RequestLawyer extends Command {
  constructor() {
    super({
      preconditions: ['court_only', 'court_case', 'defendant_only'],
      args: [
        new Argument({
          example: '"Good guy"',
          key: 'member',
          name: 'member',
          type: 'member'
        }),
        new Argument({
          example: '1000',
          key: 'amount',
          name: 'amount',
          type: 'amount',
          defaultValue: config.default_lawyer_request
        })
      ],
      description: 'Sets the lawyer of a court case to the requested member.',
      groupName: 'courts',
      names: ['request_lawyer', 'set_lawyer']
    });
  }

  async run(msg, args) {
    const {
      channel, channel_case
    } = await this.get_channel(msg.channel, msg.author, args.amount, args.member);

    if (channel_case.laywer_id === args.member.id) {
      return CommandResult.fromError('This user is already your lawyer.');
    } else if (!channel) {
      return CommandResult.fromError('This user has their DMs disabled and there is no main \
channel in this server.');
    }

    const prefix = `${discord.tag(msg.author).boldified}, `;

    await discord.create_msg(
      msg.channel, `${prefix}${args.member.mention} has been informed of your request.`
    );

    const result = await discord.verify_channel_msg(
      msg,
      channel,
      null,
      null,
      x => x.author.id === args.member.id
        && (x.content.toLowerCase() === 'yes' || x.content.toLowerCase() === 'no'),
      `lawyer-${channel_case.id}`,
      config.lawyer_accept_time
    ).then(x => x.promise);

    if (result.conflicting) {
      await channel.createMessage(`${args.member.mention} has cancelled their lawyer request.`);

      return CommandResult.fromError('The previous interactive lawyer command was cancelled.');
    } else if (!result.success) {
      return CommandResult.fromError('The requested lawyer didn\'t reply.');
    }

    const lower_content = result.reply.content.toLowerCase();

    if (lower_content === 'yes') {
      return this.accepted(msg.author, args.member, channel, channel_case);
    }

    await channel.createMessage(`You have successfully declined ${args.member.mention}'s offer.`);

    return CommandResult.fromError('The requested lawyer declined your offer.');
  }

  async get_channel(channel, author, amount, member) {
    const channel_case = db.get_channel_case(channel.id);
    let found_channel = await member.user.getDMChannel();
    const dm_result = await discord.dm(member.user, str.format(
      accept_message,
      discord.tag(author).boldified, number.format(amount), channel_case.id
    ), channel.guild);

    if (!dm_result) {
      found_channel = discord.get_main_channel(channel.guild.id);
    }

    return {
      channel: found_channel,
      channel_case
    };
  }

  async accepted(defendant, lawyer, channel, c_case) {
    db.set_lawyer(lawyer.id, c_case.channel_id);
    system.lawyer_picked(c_case.channel_id, lawyer.guild);
    await channel.createMessage(`You have successfully accepted ${defendant.mention}'s offer.`);

    return client.createMessage(c_case.channel_id, `${lawyer.mention} has accepted \
${defendant.mention}'s lawyer request.\n\n${lawyer.mention}, you have \
${config.auto_pick_lawyer} hours to give a plea using \`${config.prefix}plea <plea>\` \
or you will be automatically replaced with another lawyer.`);
  }
}();
