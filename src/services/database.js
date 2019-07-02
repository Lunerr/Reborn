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
const { config, queries } = require('./data.js');
const Database = require('better-sqlite3');
const path = require('path');
const str = require('../utilities/string.js');

module.exports = {
  load() {
    this.db = new Database(path.join(__dirname, '../', config.database));
    this.db.pragma('journal_mode = WAL');

    const list = Object.keys(queries);

    for (let i = 0; i < list.length; i++) {
      if (queries[list[i]].match(/{\d+}/)) {
        queries[list[i]] = queries[list[i]].replace(/[\s\r\n]+/g, ' ');
      } else {
        queries[list[i]] = this.db.prepare(queries[list[i]].replace(/[\s\r\n]+/g, ' '));
      }

      if (list[i].includes('table')) {
        queries[list[i]].run();
      }
    }
  },

  insert(table, columns) {
    const now = Date.now();

    columns.created_at = now;
    columns.last_modified_at = now;

    const keys = Object.keys(columns);

    return this.db.prepare(str.format(
      queries.insert,
      table,
      keys.join(', '),
      keys.map(() => '?').join(', ')
    )).run(...Object.values(columns));
  },

  fetch(table, columns, insert = true) {
    const query = this.db.prepare(str.format(queries.select, table));
    const res = query.get(columns.guild_id);

    if (res) {
      return res;
    }

    if (insert) {
      this.insert(table, columns);

      return query.get(columns.guild_id);
    }
  },

  update(table, changed) {
    const now = Date.now();
    const existing = this.db.prepare(str.format(queries.select, table)).get(changed.guild_id);

    changed.created_at = existing && existing.created_at ? existing.created_at : now;
    changed.last_modified_at = now;

    const columns = Object.keys(changed);
    const updates = [];

    for (let i = 0; i < columns.length; i++) {
      if (columns[i] === 'guild_id' || columns[i] === 'created_at') {
        continue;
      }

      updates.push(`${columns[i]}=excluded.${columns[i]}`);
    }

    this.db.prepare(str.format(
      queries.upsert,
      table,
      columns.join(', '),
      columns.map(() => '?').join(', '),
      updates.join(', ')
    )).run(...Object.values(changed));
  },

  exists(table, column, value) {
    return Object.values(this.db.prepare(str.format(
      queries.exists,
      table,
      column,
      value
    )).get())[0] !== 0;
  },

  close_case(id) {
    return queries.close_case.run(id);
  },

  close_warrant(id) {
    return queries.close_warrant.run(id);
  },

  close_law(id) {
    return queries.close_law.run(id);
  },

  close_command(id) {
    return queries.close_cmd.run(id);
  },

  set_jailed(status, guild_id, member_id) {
    return queries.set_jailed.run(status, member_id, guild_id);
  },

  set_trial(status, guild_id, member_id) {
    return queries.set_trial.run(status, member_id, guild_id);
  },

  set_warrant_last_notified(id, time) {
    return queries.set_warrant_last_notified.run(time, id);
  },

  set_case_inactive_count(id, count) {
    return queries.set_case_inactive_count.run(count, id);
  },

  approve_warrant(id, judge_id) {
    return queries.approve_warrant.run(judge_id, id);
  },

  get_member(member_id, guild_id) {
    return queries.get_member.get(member_id, guild_id);
  },

  get_channel_case(channel_id) {
    return queries.select_channel_case.get(channel_id);
  },

  get_case(id) {
    return queries.select_case.get(id);
  },

  get_law(id) {
    return queries.select_law.get(id);
  },

  get_verdict(case_id) {
    return queries.select_verdict.get(case_id);
  },

  get_warrant(id) {
    return queries.select_warrant.get(id);
  },

  get_impeachment(guild_id, member_id) {
    return queries.select_impeachment.get(guild_id, member_id);
  },

  fetch_cases(id) {
    return queries.select_cases.all(id);
  },

  fetch_laws(id) {
    return queries.select_laws.all(id);
  },

  fetch_warrants(id) {
    return queries.select_warrants.all(id);
  },

  fetch_member_verdicts(guild_id, defendant_id) {
    return queries.select_member_verdicts.all(guild_id, defendant_id);
  },

  fetch_verdicts(guild_id) {
    return queries.select_verdicts.all(guild_id);
  },

  fetch_commands(guild_id) {
    return queries.select_commands.all(guild_id);
  }
};
