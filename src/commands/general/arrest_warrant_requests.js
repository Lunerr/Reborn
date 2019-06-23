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
const { config } = require('../../services/data.js');
const discord = require('../../utilities/discord.js');
const number = require('../../utilities/number.js');
const empty_argument = Symbol('Empty Argument');
const max_msg_len = 1900;
const day_hours = 24;

module.exports = new class ArrestWarrantRequests extends Command {
  constructor() {
    super({
      args: [
        new Argument({
          example: '2',
          key: 'id',
          name: 'id',
          type: 'int',
          defaultValue: empty_argument
        })
      ],
      description: 'View the current request warrants.',
      groupName: 'general',
      names: ['arrest_warrant_requests', 'requests', 'warrants']
    });
  }

  async run(msg, args) {
    let warrants = db
      .fetch_warrants(msg.channel.guild.id)
      .filter(x => x.request === 1)
      .sort((a, b) => a.id - b.id);
    const activeWarrants = warrants.filter(x => x.executed === 0);

    if (!activeWarrants.length) {
      return CommandResult.fromError('There are no active request warrants.');
    }

    if (args.id !== empty_argument) {
      warrants = warrants.find(x => x.id === args.id);

      if (!warrants) {
        return CommandResult.fromError('This request warrant does not exist.');
      } else if (warrants.executed === 1) {
        return CommandResult.fromError('This request warrant has already been served.');
      }

      warrants = [warrants];
    }

    await this.send_warrants(msg, activeWarrants);
  }

  async send_warrants(msg, warrants) {
    let content = '';

    for (let i = 0; i < warrants.length; i++) {
      const { id, defendant_id, judge_id, law_id, created_at, officer_id, approved } = warrants[i];
      const law = db.get_law(law_id);
      let defendant = (msg.channel.guild.members.get(defendant_id) || {}).user;
      let judge = (msg.channel.guild.members.get(judge_id) || {}).user;
      let officer = (msg.channel.guild.members.get(officer_id) || {}).user;

      if (!defendant) {
        defendant = await msg._client.getRESTUser(defendant_id);
      }

      if (approved === 1 && !judge) {
        judge = await msg._client.getRESTUser(judge_id);
      }

      if (!officer) {
        officer = await msg._client.getRESTUser(officer_id);
      }

      const expires = created_at + config.auto_close_warrant - Date.now();
      const message = `**${id}**. Requested against **${discord.tag(defendant)}** by **\
${discord.tag(officer)}** for violating the law: ${law.name} (${approved === 1 ? `approved by \
**${discord.tag(judge)}** and ` : ''}${this.format_time(expires)}).\n`;

      if ((content + message).length >= max_msg_len) {
        await discord.create_msg(msg.channel, {
          title: 'Request Warrants',
          description: content
        });
        content = '';
      } else {
        content += message;
      }
    }

    if (content) {
      await discord.create_msg(msg.channel, {
        title: 'Request Warrants',
        description: content
      });
    }
  }

  format_time(expires) {
    const { days, hours } = number.msToTime(expires);

    if (expires <= 0 || !hours) {
      return 'expiring Soon';
    }

    return `expires in ${(day_hours * days) + hours} hours`;
  }
}();
