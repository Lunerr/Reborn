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
const db = require('../../services/database.js');
const discord = require('../../utilities/discord.js');
const system = require('../../utilities/system.js');

module.exports = new class SetLaw extends Command {
  constructor() {
    super({
      preconditions: ['guild_db_exists', 'law_channel'],
      args: [
        new Argument({
          example: '"Rule 1"',
          key: 'name',
          name: 'name',
          type: 'string'
        }),
        new Argument({
          example: '"The people have the right to bear arms!"',
          key: 'content',
          name: 'content',
          type: 'string'
        }),
        new Argument({
          example: 'yes',
          key: 'mandatory',
          name: 'mandatory felony',
          type: 'bool',
          defaultValue: false
        })
      ],
      description: 'Adds a law or edits an existing one.',
      groupName: 'owners',
      names: ['set_law']
    });
  }

  async run(msg, args) {
    const name = args.name.toLowerCase();
    let laws = db.fetch_laws(msg.channel.guild.id);
    const existing_law = laws.find(x => x.name.toLowerCase() === name);
    const law = {
      guild_id: msg.channel.guild.id,
      name: args.name,
      content: args.content,
      mandatory_felony: args.mandatory ? 1 : 0
    };
    let id;
    let reply;

    if (existing_law && existing_law.active === 1) {
      reply = 'edited';
      id = this.edit_existing(existing_law, law, laws);
    } else {
      reply = 'created';
      id = db.insert('laws', law).lastInsertRowid;
    }

    await discord.create_msg(
      msg.channel,
      `${discord.tag(msg.author).boldified}, I have ${reply} the law ${args.name} (${id}).`
    );

    const { law_channel } = db.fetch('guilds', { guild_id: msg.channel.guild.id });
    const channel = msg.channel.guild.channels.get(law_channel);

    laws = db.fetch_laws(msg.channel.guild.id).filter(x => x.active === 1);

    return system.update_laws(channel, laws);
  }

  edit_existing(old_law, new_law, laws) {
    const edit_edited = laws.find(
      x => x.active === 1
        && x.in_effect === 0
        && x.edited_at === null
        && x.name === new_law.name
    );
    const now = Date.now();
    let id;

    if (edit_edited) {
      ({ id } = edit_edited);
      db.set_law_description(edit_edited.id, new_law.content);
      db.set_law_created_at(edit_edited.id, now);
    }

    db.set_law_edited_at(old_law.id, now);

    if (!edit_edited) {
      id = db.insert('laws', new_law).lastInsertRowid;
    }

    return id;
  }
}();
