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
const system = require('../../utilities/system.js');
const min_amount = 0;

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
          defaultValue: config.default_lawyer_request,
          preconditions: ['min', 'cash'],
          preconditionOptions: [{ minimum: min_amount }]
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
    } = await system.get_channel(msg.channel, args.member, msg.author, args.amount);

    if (channel_case.laywer_id === args.member.id) {
      return CommandResult.fromError('This user is already your lawyer.');
    } else if (channel_case.lawyer_id !== null) {
      const lawyer = await client.getRESTUser(channel_case.lawyer_id);

      return CommandResult.fromError(
        `You already have ${discord.tag(lawyer).boldified} as your lawyer.`
      );
    } else if (!channel) {
      return CommandResult.fromError('This user has their DMs disabled and there is no main \
channel in this server.');
    }

    const result = await this.verify(msg, args.member, channel, channel_case);

    if (result.conflicting) {
      await channel.createMessage(`${args.member.mention} has cancelled their lawyer request.`);

      return CommandResult.fromError('The previous interactive lawyer command was cancelled.');
    } else if (!result.success) {
      return CommandResult.fromError('The requested lawyer didn\'t reply.');
    }

    const lower_content = result.reply.content.toLowerCase();

    if (lower_content === 'yes') {
      return system.accept_lawyer(msg.author, args.member, channel, channel_case);
    }

    await channel.createMessage(`You have successfully declined ${args.member.mention}'s offer.`);

    return CommandResult.fromError('The requested lawyer declined your offer.');
  }

  async verify(msg, member, channel, channel_case) {
    const prefix = `${discord.tag(msg.author).boldified}, `;

    await discord.create_msg(
      msg.channel, `${prefix}${member.mention} has been informed of your request.`
    );

    return discord.verify_channel_msg(
      msg,
      channel,
      null,
      null,
      x => x.author.id === member.id
        && (x.content.toLowerCase() === 'yes' || x.content.toLowerCase() === 'no'),
      `lawyer-${channel_case.id}`,
      config.lawyer_accept_time
    ).then(x => x.promise);
  }
}();
