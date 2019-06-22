const discord = require('./discord.js');

module.exports = {
  max_msgs: 100,

  async prune(channel) {
    let messages = await channel.getMessages(this.max_msgs);

    while (messages.length) {
      await channel.deleteMessages([...new Set(messages.map(x => x.id))]).catch(() => null);
      messages = await channel.getMessages(this.max_msgs);
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

  async add_law(channel, law) {
    await channel.createMessage({ embed: this.format_laws([law])[0] });
  },

  async update_laws(channel, laws) {
    await this.prune(channel);

    const msgs = this.format_laws(laws);

    for (let i = 0; i < msgs.length; i++) {
      channel.createMessage({ embed: msgs[i] });
    }
  }
};
