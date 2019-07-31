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
const { Argument, Command } = require('patron.js');
const system = require('../../utilities/system.js');

module.exports = new class AllowInCourt extends Command {
  constructor() {
    super({
      preconditions: [
        'court_only',
        'court_case',
        'judge_creator',
        'lawyer_set',
        'plea_set'
      ],
      args: [
        new Argument({
          example: 'Stipendi',
          key: 'member',
          name: 'member',
          type: 'member',
          remainder: true
        })
      ],
      description: 'Allows a citizen to speak at a hearing.',
      groupName: 'courts',
      names: ['allow_in_court', 'add_to_court']
    });
    this.bitfield = 2048;
  }

  async run(msg, args) {
    await msg.channel.editPermission(
      args.member.id, this.bitfield, 0, 'member', `Added to the court case ${msg.channel.name}`
    );
    await system._court_channel(msg, args.member, 'added to');
  }
}();
