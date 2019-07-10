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

const { MultiMutex } = require('patron.js');
const { config } = require('../services/data.js');
const client = require('../services/client.js');
const discord = require('./discord.js');
const db = require('../services/database.js');
const verdict = require('../enums/verdict.js');
const branch = require('../enums/branch.js');
const number = require('./number.js');
const catch_discord = require('../utilities/catch_discord.js');
const remove_role = catch_discord(client.removeGuildMemberRole.bind(client));

module.exports = {
  chief_roles: ['chief_justice_role', 'chief_officer_role', 'house_speaker_role'],
  jailed_roles: ['imprisoned_role', 'jailed_role', 'trial_role'],
  gov_roles: ['officer_role', 'judge_role', 'congress_role'],
  day_hours: 24,
  max_evidence: 16e2,
  max_warrants: 25,
  bitfield: 2048,
  mutex: new MultiMutex(),

  get_branch_members(guild, role, chief) {
    return guild.members.filter(x => (x.roles.includes(role) || x.roles.includes(chief))
      && discord.is_online(x));
  },

  chief_role(member) {
    const res = db.fetch('guilds', { guild_id: member.guild.id });

    return Object.keys(res).find(
      x => this.chief_roles.includes(x) && member.roles.includes(res[x])
    ) || null;
  },

  branch_role_from_chief(member) {
    const chief_role = this.chief_role(member);

    return branch[chief_role] || null;
  },

  async update_guild_case(id, guild) {
    const new_case = db.get_case(id);
    const { case_channel } = db.fetch('guilds', { guild_id: guild.id });
    const c_channel = guild.channels.get(case_channel);

    if (c_channel) {
      return this.edit_case(c_channel, new_case);
    }

    return null;
  },

  async free_from_court(guild_id, defendant_id, roles) {
    const cases = db.fetch_cases(guild_id);
    let free = true;

    for (let i = 0; i < cases.length; i++) {
      if (cases[i].defendant_id !== defendant_id) {
        continue;
      }

      const case_verdict = db.get_verdict(cases[i].id);
      const no_verdict = !case_verdict || case_verdict.verdict === verdict.pending;

      if (no_verdict) {
        free = false;
        break;
      }
    }

    if (free) {
      for (let i = 0; i < roles.length; i++) {
        await remove_role(guild_id, defendant_id, roles[i], 'Court case is over');
      }
    }

    return free;
  },

  case_finished(case_id) {
    const currrent_verdict = db.get_verdict(case_id);
    const finished = currrent_verdict && currrent_verdict.verdict !== verdict.pending;

    if (finished) {
      let reason = '';

      if (currrent_verdict.verdict === verdict.mistrial) {
        reason = 'This case has already been declared as a mistrial.';
      } else if (currrent_verdict.verdict === verdict.inactive) {
        reason = 'This case has already been declared inactive.';
      } else {
        reason = 'This case has already reached a verdict.';
      }

      return {
        finished: true,
        reason
      };
    }

    return {
      finished: false
    };
  },

  async close_case(to_pin, channel) {
    await to_pin.pin();
    await Promise.all(channel.permissionOverwrites.map(
      x => channel.editPermission(x.id, 0, this.bitfield, x.type, 'Case is over')
    ));
  },

  mute_felon(guild_id, defendant_id, law) {
    let mute = false;
    const verdicts = db
      .fetch_member_verdicts(guild_id, defendant_id)
      .filter(x => x.verdict === verdict.guilty);
    let count = 0;

    for (let i = 0; i < verdicts.length; i++) {
      const user_case = db.get_case(verdicts[i].case_id);
      const { name } = db.get_law(user_case.law_id);

      if (name === law.name) {
        count++;
      }

      if (count >= config.repeat_felon_count) {
        mute = true;
        break;
      }
    }

    return mute;
  },

  async find(items, fn, extra) {
    let res;

    for (let i = 0; i < items.length; i++) {
      const found = await fn(items[i], extra, i);

      if (found) {
        res = found;
        break;
      }
    }

    return res;
  },

  parse_id(msg) {
    const [embed] = msg.embeds;

    if (!embed.description) {
      return null;
    }

    return Number(embed.description.split('**ID:** ')[1].split('\n')[0]);
  },

  async should_prune(channel, arr, fn) {
    const messages = await discord.fetch_msgs(channel);

    if (messages.length !== arr.length || messages.some(x => x && !x.embeds.length)) {
      return true;
    }

    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const was_sent = await this.find(messages, fn, item);

      if (!was_sent) {
        return true;
      }
    }

    return false;
  },

  async prune(channel) {
    const messages = await discord.fetch_msgs(channel);

    await channel.deleteMessages(messages.map(x => x.id)).catch(() => null);
  },

  format_laws(laws) {
    const msgs = [];

    for (let i = 0; i < laws.length; i++) {
      const { name, content, mandatory_felony } = laws[i];
      const { embed } = discord.embed({});

      embed.title = name;
      embed.description = `${content}${mandatory_felony ? ' (felony)' : ''}`;
      msgs.push(embed);
    }

    return msgs;
  },

  add_law(channel, law) {
    return this.mutex.sync(`${channel.guild.id}-laws`, async () => channel
      .createMessage({ embed: this.format_laws([law])[0] }));
  },

  async update_laws(channel, laws) {
    return this.mutex.sync(`${channel.guild.id}-laws`, async () => {
      const fn = (x, item) => x && x.embeds[0].title === item.name;
      const to_prune = await this.should_prune(channel, laws, fn);

      if (to_prune) {
        await this.prune(channel);

        const msgs = this.format_laws(laws);

        for (let i = 0; i < msgs.length; i++) {
          await channel.createMessage({ embed: msgs[i] });
        }
      }

      return laws;
    });
  },

  format_warrant_time(time_left) {
    const { days, hours, minutes } = number.msToTime(time_left);
    let format = '';

    if (time_left < 0) {
      format = 'Expired';
    } else if (days || hours || minutes) {
      const total_time = this.day_hours * days;
      const time = total_time + hours ? `${total_time + hours} hours` : `${minutes} minutes`;

      format = `Expires in ${time}`;
    } else {
      format = 'Expiring soon';
    }

    return format;
  },

  async format_warrant(guild, warrant, id, served, type = 'Warrant') {
    const { defendant_id, judge_id, evidence, approved, created_at, law_id } = warrant;
    const law = db.get_law(law_id);
    const defendant = client.users.get(defendant_id) || await client.getRESTUser(defendant_id);
    let judge;

    if (approved) {
      judge = guild.members.get(judge_id) || await client.getRESTUser(judge_id);
    }

    const format = this.format_warrant_time(created_at + config.auto_close_warrant - Date.now());

    return {
      title: `${type} for ${discord.tag(defendant)} (${law.name})`,
      description: `**ID:** ${id}${judge ? `\n**Granted by:** ${judge.mention}` : ''}
**Evidence:**${evidence ? `\n${evidence.trim().slice(0, this.max_evidence)}` : 'N/A'}
**Status:** ${served ? 'Served' : format}`
    };
  },

  async edit_warrant(channel, warrant) {
    return this.mutex.sync(`${channel.guild.id}-warrants`, async () => {
      const msgs = await discord.fetch_msgs(channel);
      const { id, executed } = warrant;
      const found = msgs.find(x => this.parse_id(x) === id);

      if (found) {
        const obj = discord.embed(await this.format_warrant(channel.guild, warrant, id, executed));

        return found.edit(obj);
      }

      return warrant;
    });
  },

  async add_warrant(channel, warrant) {
    return this.mutex.sync(`${channel.guild.id}-warrants`, async () => {
      const { id, executed } = warrant;
      const obj = discord.embed(await this.format_warrant(channel.guild, warrant, id, executed));

      return channel.createMessage(obj);
    });
  },

  async update_warrants(channel, warrants) {
    return this.mutex.sync(`${channel.guild.id}-warrants`, async () => {
      const msgs = await discord.fetch_msgs(channel);
      const [most_recent] = msgs;
      const id = this.parse_id(most_recent);
      const index = warrants.findIndex(x => x.id === id);

      if (index !== -1) {
        const sliced = warrants.slice(index + 1);

        for (let i = 0; i < sliced.length; i++) {
          const obj = discord.embed(await this.format_warrant(
            channel.guild, sliced[i], sliced[i].id, sliced[i].executed
          ));

          await channel.createMessage(obj);
        }
      }

      return warrants;
    });
  },

  async format_case(guild, c_case) {
    const judge = guild.members.get(c_case.judge_id) || await client.getRESTUser(c_case.judge_id);
    const case_verdict = db.get_verdict(c_case.id);
    let verdict_string;
    let append = `\n**Presiding judge:** ${judge.mention}`;

    if (case_verdict) {
      verdict_string = Object.keys(verdict).find(x => verdict[x] === case_verdict.verdict);
      verdict_string = verdict_string[0].toUpperCase() + verdict_string.slice(1);
      append += `\n**Verdict:** ${verdict_string}`;

      if (case_verdict.verdict !== verdict.mistrial) {
        append += `\n**Opinion:** ${case_verdict.opinion}`;
      }
    }

    const warrant = db.get_warrant(c_case.warrant_id);
    const format = await this.format_warrant(guild, warrant, c_case.id, case_verdict, 'Case');

    format.description += append;

    return format;
  },

  async edit_case(channel, c_case) {
    return this.mutex.sync(`${channel.guild.id}-cases`, async () => {
      const msgs = await discord.fetch_msgs(channel);
      const found = msgs.find(x => this.parse_id(x) === c_case.id);

      if (found) {
        const obj = discord.embed(await this.format_case(channel.guild, c_case));

        return found.edit(obj);
      }

      return c_case;
    });
  },

  async add_case(channel, c_case) {
    return this.mutex.sync(`${channel.guild.id}-cases`, async () => {
      const obj = discord.embed(await this.format_case(channel.guild, c_case));

      return channel.createMessage(obj);
    });
  },

  async update_cases(channel, cases) {
    return this.mutex.sync(`${channel.guild.id}-cases`, async () => {
      const msgs = await discord.fetch_msgs(channel);
      const [most_recent] = msgs;
      const id = this.parse_id(most_recent);
      const index = cases.findIndex(x => x.id === id);

      if (index !== -1) {
        const sliced = cases.slice(index + 1);

        for (let i = 0; i < sliced.length; i++) {
          const obj = discord.embed(await this.format_case(channel.guild, sliced[i]));

          await channel.createMessage(obj);
        }
      }

      return cases;
    });
  }
};
