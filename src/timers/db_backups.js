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
const { config } = require('../services/data.js');
const Timer = require('../utilities/timer.js');
const util = require('util');
const fs = require('fs');
const path = require('path');
const unlink = util.promisify(fs.unlink);
const rm_folder = util.promisify(fs.rmdir);
const read_dir = util.promisify(fs.readdir);
const mk_dir = util.promisify(fs.mkdir);
const copy_file = util.promisify(fs.copyFile);
const dir = path.join(__dirname, '../../', config.db_backup_dir);
const files = [config.database, `${config.database}-shm`, `${config.database}-wal`];

function copy(name, dest) {
  const src = path.join(__dirname, '../', name);
  const out = path.join(dest, name);

  return copy_file(src, out);
}

function create_dir(dest) {
  return mk_dir(dest).catch(err => {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  });
}

async function delete_folder(dir_path) {
  const read_files = await read_dir(dir_path);

  for (let i = 0; i < read_files.length; i++) {
    const file = read_files[i];
    const new_path = path.join(dir_path, file);

    await unlink(new_path);
  }

  return rm_folder(dir_path);
}

Timer(async () => {
  await create_dir(dir);

  const now = new Date();
  const previous = await read_dir(dir);

  if (previous.length) {
    const last = previous[previous.length - 1];
    const [month, day, year] = last.split('_');
    const prev_time = new Date(Number(year), Number(month) - 1, Number(day)).getTime();

    if (now.getTime() - prev_time >= config.db_previous_time) {
      await delete_folder(path.join(dir, last));
    } else {
      return;
    }
  }

  const format = now.toLocaleString().replace(/(\/|,|\s|:)+/g, '_');
  const backup_folder = path.join(dir, format);

  await create_dir(backup_folder);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    await copy(file, backup_folder);
  }
}, config.db_backup_time);
