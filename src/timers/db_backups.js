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
const { config } = require('../services/data.js');
const Timer = require('../utilities/timer.js');
const util = require('util');
const fs = require('fs');
const path = require('path');
const mk_dir = util.promisify(fs.mkdir);
const copy_file = util.promisify(fs.copyFile);
const dir = path.join(__dirname, '../../', config.db_backup_dir);

Timer(async () => {
  await mk_dir(dir).catch(err => {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  });

  const format = new Date().toLocaleString().replace(/(\/|,|\s|:)+/g, '_');
  const backup_folder = path.join(dir, format);

  await mk_dir(backup_folder).catch(err => {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  });
  await copy_file(
    path.join(__dirname, '../', config.database),
    path.join(backup_folder, config.database)
  );
  await copy_file(
    path.join(__dirname, '../', `${config.database}-shm`),
    path.join(backup_folder, `${config.database}-shm`)
  );
  await copy_file(
    path.join(__dirname, '../', `${config.database}-wal`),
    path.join(backup_folder, `${config.database}-wal`)
  );
}, config.db_backup_time);
