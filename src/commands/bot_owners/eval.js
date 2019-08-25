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
const { Command, Argument, Context } = require('patron.js');
const ERR_LENGTH = 900;
const util = require('util');
const discord = require('../../utilities/discord.js');

module.exports = new class Eval extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          name: 'code',
          key: 'code',
          type: 'string',
          example: 'client.token',
          remainder: true
        })
      ],
      usableContexts: [Context.DM, Context.Guild],
      description: 'Evalute JavaScript code.',
      groupName: 'bot_owners',
      names: ['eval']
    });
  }

  async run(msg, args) {
    try {
      /* eslint-disable no-unused-vars */
      const { _client: client, _client: { db }, channel, channel: { guild }, author, member } = msg;
      /* eslint-enable no-unused-vars */
      let result = eval(args.code);

      if (result instanceof Promise) {
        result = await result;
      }

      if (typeof result !== 'string') {
        result = util.inspect(result, { depth: 0 });
      }

      result = result.replace(msg._client.token, ' ');

      return discord.send_fields_message(msg.channel.id,
        ['Eval', `\`\`\`js\n${args.code}\`\`\``, 'Returns', `\`\`\`js\n${result}\`\`\``],
        false);
    } catch (err) {
      return discord.send_fields_message(msg.channel.id,
        [
          'Eval',
          `\`\`\`js\n${args.code}\`\`\``,
          'Error',
          `\`\`\`js\n${err.stack
            .slice(0, ERR_LENGTH)}\`\`\``
        ],
        false,
        [255, 0, 0]);
    }
  }
}();
