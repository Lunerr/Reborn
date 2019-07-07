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
const { MultiMutex } = require('patron.js');
const client = require('../services/client.js');
const { config } = require('../services/data.js');
const db = require('../services/database.js');
const Timer = require('../utilities/timer.js');
const discord = require('../utilities/discord.js');
const log = require('../utilities/logger.js');
const expiration = 18e5;
const mutex = new MultiMutex();
const chunk_size = 100;
const bulk_del_time = 12e8;
const bad_words = [
  'neg',
  'nig',
  'fag',
  'queer',
  'whore',
  'fuck',
  'cunt',
  'chink',
  'bitch',
  'slut',
  'ass',
  'whore',
  'vagina',
  'child',
  'penis',
  'anal',
  'sodomy',
  'butt',
  'sex',
  'pussy',
  'dick',
  'cock',
  'abuse',
  'wiener',
  'animal',
  'vaginal',
  'missionary',
  'cowgirl',
  'doggy',
  'trans',
  'trap',
  'trannie',
  'tranny',
  'lgbt',
  'gay',
  'homo',
  'homosexual',
  'homophobic',
  'underage',
  'year',
  'old',
  '18'
];
const reg = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
const msg_limit = 2e3;

function chunk(arr, size) {
  const chunked = [];

  for (let i = 0; i < arr.length; i += size) {
    chunked.push(arr.slice(i, i + size));
  }

  return chunked;
}

async function purify(channel) {
  return mutex.sync(`${channel.id}-${channel.guild.id}`, async () => {
    const msgs = await discord.fetch_msgs(channel, msg_limit);
    const now = Date.now();
    const to_delete = msgs.filter(
      x => x.author.id !== channel.guild.ownerID
        && !x.pinned
        && x.timestamp + expiration < now
        && (bad_words.some(c => x.content.toLowerCase().includes(c.toLowerCase()))
        || x.attachments.length
        || reg.test(x.content))
    );
    const bulk_del = to_delete.filter(x => now - x.timestamp < bulk_del_time);
    const single_del = to_delete.filter(x => !bulk_del.some(c => c.id === x.id));
    const chunked = chunk(bulk_del.map(x => x.id), chunk_size);

    for (let i = 0; i < chunked.length; i++) {
      await channel.deleteMessages(chunked[i]).catch(() => null);
    }

    for (let i = 0; i < single_del.length; i++) {
      await channel.deleteMessage(single_del[i].id, 'Contained profane content').catch(() => null);
    }

    if (bulk_del.length || single_del.length) {
      await log.info(`Bulk deleted ${bulk_del.length} messages and deleted ${single_del.length} \
messages manually in ${channel.name} (${channel.id})`);
    }

    return msgs;
  });
}

Timer(async () => {
  const keys = [...client.guilds.keys()];

  for (let i = 0; i < keys.length; i++) {
    const guild = client.guilds.get(keys[i]);
    const {
      cleanse, warrant_channel, law_channel, case_channel, court_category
    } = db.fetch('guilds', { guild_id: keys[i] });

    if (!guild || cleanse === 0) {
      continue;
    }

    const channels = guild.channels.filter(
      x => x.type === 0
      && x.permissionsOf(client.user.id).has('manageMessages')
      && x.permissionsOf(client.user.id).has('readMessages')
    );

    for (let j = 0; j < channels.length; j++) {
      const channel = channels[j];

      if (channel.id === warrant_channel
        || channel.id === law_channel
        || channel.id === case_channel
        || channel.parentID === court_category) {
        continue;
      }

      await purify(channel);
    }
  }
}, config.auto_cleanse);
