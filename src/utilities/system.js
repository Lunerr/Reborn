const { MultiMutex } = require('patron.js');
const { config } = require('../services/data.js');
const discord = require('./discord.js');
const db = require('../services/database.js');
const verdict = require('../enums/verdict.js');
const number = require('./number.js');
const day_hours = 24;

module.exports = {
  max_msgs: 100,
  max_warrants: 25,
  mutex: new MultiMutex(),

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

  async should_prune(channel, arr, fn) {
    const messages = await channel.getMessages(this.max_msgs);

    if (messages.length !== arr.length || messages.some(x => !x.embeds.length)) {
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
    let messages;

    while ((messages = await channel.getMessages(this.max_msgs)).length) {
      messages = messages.map(x => x.id);
      await channel.deleteMessages(messages).catch(() => null);
    }
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
    return this.mutex.sync(`${channel.guild.id}-${law.id}`, async () => channel
      .createMessage({ embed: this.format_laws([law])[0] }));
  },

  async update_laws(channel, laws) {
    return this.mutex.sync(`${channel.guild.id}-laws`, async () => {
      const fn = (x, item) => x.embeds[0].title === item.name;
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

  async format_warrant(guild, warrant, id, served, add_law = true, add_defendant = true) {
    const { defendant_id, judge_id, evidence, approved, created_at, law_id } = warrant;
    const law = db.get_law(law_id);
    let defendant = (guild.members.get(defendant_id) || {})
      .user || await msg._client.getRESTUser(defendant_id);
    let judge = guild.members.get(judge_id);

    if (approved && !judge) {
      judge = await guild.shard.client.getRESTUser(judge_id);
    }

    const time_left = created_at + config.auto_close_warrant - Date.now();
    const { days, hours, minutes } = number.msToTime(time_left);
    let format = '';

    if (time_left < 0) {
      format = 'Expired';
    } else if (days || hours || minutes) {
      const total_time = day_hours * days;
      const time = hours ? `${total_time + hours} hours` : `${total_time + minutes} minutes`;

      format = `Expires in ${time}`;
    } else {
      format = 'Expiring soon';
    }

    return `**ID:** ${id}${judge ? `\n**Granted by:** ${judge.mention}` : ''}\
${add_defendant ? `\n**Defendant:** ${defendant.mention}` : ''}\
${add_law ? `\n**In violation of the law:** ${law.name}` : ''}\n**Evidence:** \
${evidence || 'N/A'}\n**Served:** ${served ? 'Yes' : 'No'}\n**Expiration:** ${format}.`;
  },

  async edit_warrant(channel, warrant) {
    return this.mutex.sync(`${channel.guild.id}-${warrant.id}`, async () => {
      const msgs = await channel.getMessages(this.max_msgs);
      const found = msgs.find(x => Number(x.embeds[0].title) === warrant.id);

      if (found) {
        const obj = discord.embed({ title: warrant.id });

        obj.embed.description = await this.format_warrant(
          channel.guild, warrant, warrant.id, warrant.executed
        );

        return found.edit(obj);
      }
    });
  },

  async add_warrant(channel, warrant) {
    return this.mutex.sync(`${channel.guild.id}-${warrant.id}`, async () => {
      const msgs = await channel.getMessages(this.max_msgs);

      if (msgs.length >= this.max_warrants) {
        await msgs[msgs.length - 1].delete();
      }

      const obj = discord.embed({ title: warrant.id });

      obj.embed.description = await this.format_warrant(
        channel.guild, warrant, warrant.id, warrant.executed
      );

      return channel.createMessage(obj);
    });
  },

  async update_warrants(channel, warrants) {
    return this.mutex.sync(`${channel.guild.id}-warrants`, async () => {
      const fn = async (x, item) => x.embeds[0].description === await this
        .format_warrant(channel.guild, item, item.id, item.executed);
      const to_prune = await this.should_prune(channel, warrants, fn);

      if (to_prune) {
        await this.prune(channel);

        for (let i = 0; i < warrants.length; i++) {
          await this.add_warrant(channel, warrants[i]);
        }
      }

      return warrants;
    });
  },

  async format_case(guild, c_case) {
    const judge = guild.members.get(c_case.judge_id) || await guild
      .shard.client.getRESTUser(c_case.judge_id);
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
    const case_format = `${await this.format_warrant(
      guild, warrant, c_case.id, case_verdict
    )}${append}`;

    return case_format;
  },

  async edit_case(channel, c_case) {
    return this.mutex.sync(`${channel.guild.id}-${c_case.id}`, async () => {
      const msgs = await channel.getMessages(this.max_msgs);
      const found = msgs.find(x => Number(x.embeds[0].title) === c_case.id);

      if (found) {
        const obj = discord.embed({ title: c_case.id });

        obj.embed.description = await this.format_case(channel.guild, c_case);

        return found.edit(obj);
      }
    });
  },

  async add_case(channel, c_case) {
    return this.mutex.sync(`${channel.guild.id}-${c_case.id}`, async () => {
      const obj = discord.embed({ title: c_case.id });

      obj.embed.description = await this.format_case(channel.guild, c_case);

      return channel.createMessage(obj);
    });
  },

  async update_cases(channel, cases) {
    return this.mutex.sync(`${channel.guild.id}-cases`, async () => {
      const fn = async (x, item) => x.embeds[0].description === await this
        .format_case(channel.guild, item);
      const to_prune = await this.should_prune(channel, cases, fn);

      if (to_prune) {
        await this.prune(channel);

        for (let i = 0; i < cases.length; i++) {
          await this.add_case(channel, cases[i]);
        }
      }

      return cases;
    });
  }
};
