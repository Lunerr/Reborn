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
const db = require('../../services/database.js');
const { Precondition, PreconditionResult } = require('patron.js');

module.exports = new class JudgeCreator extends Precondition {
  constructor() {
    super({ name: 'judge_creator' });
  }

  async run(cmd, msg) {
    const c_case = db.get_channel_case(msg.channel.id);
    const { judge_id } = c_case;
    const judge = msg.channel.guild.members.get(judge_id);

    if (msg.author.id !== judge_id && judge) {
      return PreconditionResult.fromError(cmd, `Only ${judge.mention} may use this command.`);
    }

    return PreconditionResult.fromSuccess();
  }
}();
